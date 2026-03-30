---
name: cloud-env-setup
description: "Sets up the local prerequisites for running Kibana tests against ECH (Elastic Cloud Hosted / stateful) and MKI (Managed Kibana Infrastructure / serverless). Writes .scout/servers/cloud_ech.json, .scout/servers/cloud_mki.json, and .ftr/role_users.json by talking to the Elastic Cloud API. Run this once per machine or when switching cloud environments."
---

# Cloud Environment Setup

## Trigger
When the user wants to set up or refresh their local cloud test environment config (e.g., "set up ECH", "configure MKI", "set up cloud env for testing").

## Prerequisites
- `curl` and `jq` available in the shell
- An Elastic Cloud API key (created in the Cloud UI: Organization → API keys)

---

## Step 1 — Determine scope

Ask the user:
1. **Which environment?** ECH, MKI, or both
2. **Which Cloud host?**
   - QA: `console.qa.cld.elstc.co` *(default for Elasticians)*
   - Production: `cloud.elastic.co`

Store as `CLOUD_HOST`.

---

## Step 2 — Get and verify the Cloud API key

Check if already set in the environment:
```bash
echo "${ELASTIC_CLOUD_API_KEY:-not set}"
```

If not set, ask the user for it. Do not store it anywhere — use it only in the current session as `API_KEY`.

Verify it works:
```bash
curl -sf -H "Authorization: ApiKey $API_KEY" \
  "https://$CLOUD_HOST/api/v1/deployments?size=1" > /dev/null \
  && echo "✅ API key valid" || echo "❌ API key invalid or wrong host"
```

Stop if the key is invalid.

---

## Step 3 — ECH setup

> Skip if the user only wants MKI.

### 3a — Pick a deployment

List available ECH deployments:
```bash
curl -s -H "Authorization: ApiKey $API_KEY" \
  "https://$CLOUD_HOST/api/v1/deployments?size=20" \
  | jq -r '.deployments[] | "\(.id)  \(.name)"'
```

Ask the user which deployment to use (by name or ID). Store as `DEPLOYMENT_ID`.

### 3b — Get deployment URLs and credentials

```bash
DEPLOYMENT=$(curl -s -H "Authorization: ApiKey $API_KEY" \
  "https://$CLOUD_HOST/api/v1/deployments/$DEPLOYMENT_ID")

KIBANA_URL=$(echo "$DEPLOYMENT" | jq -r \
  '.resources.kibana[0].info.metadata.endpoint // empty' \
  | sed 's|^|https://|')

ES_URL=$(echo "$DEPLOYMENT" | jq -r \
  '.resources.elasticsearch[0].info.metadata.endpoint // empty' \
  | sed 's|^|https://|')

echo "Kibana: $KIBANA_URL"
echo "ES:     $ES_URL"
```

Ask the user for the `elastic` user password (it was set at deployment creation time and cannot be retrieved via API — only reset).

If they don't have it, offer to reset it:
```bash
curl -s -XPOST -H "Authorization: ApiKey $API_KEY" \
  "https://$CLOUD_HOST/api/v1/deployments/$DEPLOYMENT_ID/elasticsearch/main-elasticsearch/_reset-password" \
  | jq -r '"New password: \(.password)"'
```

Store as `ECH_PASSWORD`.

### 3c — Create role users on ECH via Kibana API

Check if `.ftr/role_users.json` already exists and ask the user if they want to reuse it or create fresh users:
```bash
test -f .ftr/role_users.json && echo "exists" || echo "missing"
```

If creating fresh users, create each role via the Kibana Security API:

```bash
mkdir -p .ftr

for ROLE in admin editor viewer; do
  EMAIL="user+${ROLE}+skip-mfa@elasticsearch.com"
  PASSWORD="Password$(openssl rand -base64 8 | tr -dc 'A-Za-z0-9' | head -c 8)1!"

  # Create user in Kibana
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -XPOST \
    -H "kbn-xsrf: true" \
    -H "Content-Type: application/json" \
    -u "elastic:$ECH_PASSWORD" \
    "$KIBANA_URL/api/security/users/test_${ROLE}" \
    -d "{
      \"password\": \"$PASSWORD\",
      \"roles\": [\"$( [ $ROLE = admin ] && echo 'superuser' || echo $ROLE )\"],
      \"full_name\": \"Test $ROLE\",
      \"email\": \"$EMAIL\"
    }")

  echo "$ROLE: HTTP $HTTP_CODE"
  echo "  \"$ROLE\": { \"email\": \"$EMAIL\", \"password\": \"$PASSWORD\" }"
done
```

Assemble and write `.ftr/role_users.json` with the generated credentials.

> **Note:** The `+skip-mfa` suffix in the email is required — it tells Elastic Cloud to bypass MFA for these accounts.

### 3d — Write `.scout/servers/cloud_ech.json`

```bash
mkdir -p .scout/servers

cat > .scout/servers/cloud_ech.json <<EOF
{
  "serverless": false,
  "isCloud": true,
  "cloudHostName": "$CLOUD_HOST",
  "cloudUsersFilePath": ".ftr/role_users.json",
  "hosts": {
    "kibana": "$KIBANA_URL",
    "elasticsearch": "$ES_URL"
  },
  "auth": {
    "username": "elastic",
    "password": "$ECH_PASSWORD"
  },
  "license": "enterprise"
}
EOF

echo "✅ Written .scout/servers/cloud_ech.json"
```

---

## Step 4 — MKI setup

> Skip if the user only wants ECH.

### 4a — Pick a project

List available serverless projects. Ask the user for the project type first: `es`, `security`, `oblt`, or `workplaceai`. Store as `PROJECT_TYPE`.

```bash
curl -s -H "Authorization: ApiKey $API_KEY" \
  "https://$CLOUD_HOST/api/v1/serverless/projects/$PROJECT_TYPE" \
  | jq -r '.items[] | "\(.id)  \(.name)  [\(.status.phase)]"'
```

Ask the user which project to use. Store as `PROJECT_ID`.

### 4b — Wait for project to be ready (if newly created)

```bash
while true; do
  PHASE=$(curl -s -H "Authorization: ApiKey $API_KEY" \
    "https://$CLOUD_HOST/api/v1/serverless/projects/$PROJECT_TYPE/$PROJECT_ID/status" \
    | jq -r '.phase')
  echo "Phase: $PHASE"
  [ "$PHASE" = "initialized" ] && break
  sleep 10
done
```

### 4c — Reset testing-internal credentials

```bash
CREDS=$(curl -s -XPOST -H "Authorization: ApiKey $API_KEY" \
  "https://$CLOUD_HOST/api/v1/serverless/projects/$PROJECT_TYPE/$PROJECT_ID/_reset-internal-credentials")

MKI_PASSWORD=$(echo "$CREDS" | jq -r '.password')
echo "✅ testing-internal credentials reset"
```

### 4d — Get project URLs

```bash
PROJECT=$(curl -s -H "Authorization: ApiKey $API_KEY" \
  "https://$CLOUD_HOST/api/v1/serverless/projects/$PROJECT_TYPE/$PROJECT_ID")

MKI_KIBANA_URL=$(echo "$PROJECT" | jq -r '.endpoints.kibana')
MKI_ES_URL=$(echo "$PROJECT"    | jq -r '.endpoints.elasticsearch')

echo "Kibana: $MKI_KIBANA_URL"
echo "ES:     $MKI_ES_URL"
```

### 4e — Role users for MKI

Check if `.ftr/role_users.json` already exists:
```bash
test -f .ftr/role_users.json && echo "exists" || echo "missing"
```

If it exists, confirm with the user whether to reuse it (the same accounts may already be members of the MKI project).

If it doesn't exist or the user wants fresh accounts: MKI role users must be invited as organisation members — this cannot be done via API and requires the Cloud UI:

Tell the user:
> "MKI role users need to be created manually. For each role (admin, editor, viewer):
> 1. Go to `https://$CLOUD_HOST/account/members`
> 2. Click **Invite member**
> 3. Toggle **Instance access**, select the `$PROJECT_TYPE` project and the role
> 4. Use email format `user+<role>+skip-mfa@elasticsearch.com`
> 5. Once created, add each to `.ftr/role_users.json`
>
> If you already have these accounts from a previous environment, just confirm and I'll reuse the existing `.ftr/role_users.json`."

Wait for the user to confirm before proceeding.

### 4f — Write `.scout/servers/cloud_mki.json`

```bash
mkdir -p .scout/servers

cat > .scout/servers/cloud_mki.json <<EOF
{
  "serverless": true,
  "projectType": "$PROJECT_TYPE",
  "isCloud": true,
  "cloudHostName": "$CLOUD_HOST",
  "cloudUsersFilePath": ".ftr/role_users.json",
  "hosts": {
    "kibana": "$MKI_KIBANA_URL",
    "elasticsearch": "$MKI_ES_URL"
  },
  "auth": {
    "username": "testing-internal",
    "password": "$MKI_PASSWORD"
  }
}
EOF

echo "✅ Written .scout/servers/cloud_mki.json"
```

---

## Step 5 — Verify setup

Run a quick connectivity check for each configured environment:

**ECH:**
```bash
curl -sf -u "elastic:$ECH_PASSWORD" "$KIBANA_URL/api/status" \
  | jq -r '"ECH Kibana: \(.status.overall.level)"'
```

**MKI:**
```bash
curl -sf -u "testing-internal:$MKI_PASSWORD" "$MKI_KIBANA_URL/api/status" \
  | jq -r '"MKI Kibana: \(.status.overall.level)"'
```

If either check fails, report the error and suggest re-running the relevant setup step.

---

## Step 6 — Report back

Tell the user:
- Which files were written (`.scout/servers/cloud_ech.json`, `.scout/servers/cloud_mki.json`, `.ftr/role_users.json`)
- Which steps (if any) require manual action (MKI role users)
- That the setup is complete and they can now run tests against cloud targets using the `flaky-test-resolver` skill

---

## Notes

- All files written by this skill are gitignored — they contain credentials and must never be committed
- Re-run this skill any time you switch to a different deployment or project, or when `testing-internal` credentials expire
- The Cloud API key itself is never written to disk
