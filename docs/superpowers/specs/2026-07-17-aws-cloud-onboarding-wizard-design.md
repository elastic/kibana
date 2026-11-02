# AWS Cloud Onboarding Wizard — Design Spec

**Date:** 2026-07-17
**Status:** Draft — awaiting implementation plan
**Scope:** POC scoped to AWS; wizard shell is provider-agnostic for Azure/GCP extension later

---

## Problem

The current Elastic integration onboarding experience requires users to manually search for datastreams, understand which ones apply to their infrastructure, and fill in inputs for each individually. For AWS specifically, this means navigating 45 datastreams with no guidance on which ones are relevant to their account.

---

## Goal

A guided, 8-step wizard in the Security onboarding hub that:
1. Discovers what AWS services are actually running in the user's account
2. Matches those services to Elastic integrations automatically
3. Collects only the inputs that couldn't be auto-detected
4. Generates least-privilege CloudFormation templates for auth
5. Provisions agentless agents (or guides agent-based install) in one flow

---

## Entry Point

A new card in the Security onboarding hub:

```
x-pack/solutions/security/plugins/security_solution/public/onboarding/
  components/onboarding_body/cards/cloud_integrations/
```

The card follows the existing `OnboardingCardComponent` interface. Clicking "Set up AWS" navigates to the wizard route.

**Route:** `/app/security/cloud-onboarding/:provider?`

The `:provider` segment updates as the user progresses (e.g., `/app/security/cloud-onboarding/aws`). The route renders `CloudOnboardingWizard` — a full-page shell with a fixed left sidebar stepper and scrollable content area.

---

## Wizard Steps (8 total)

### Phase 1 — Discovery

#### Step 1: Select Provider
User picks cloud platform. AWS is the only active option; Azure and GCP appear as "Coming soon" cards. Provider choice is stored in wizard state and drives all downstream templates and mappings.

#### Step 2: Discovery Access
Deploy a temporary read-only CloudFormation stack so Kibana can scan the account.

**CF stack creates:**
- IAM user with `ReadOnlyAccess` + `AWSResourceExplorerReadOnlyAccess`
- Access key output via CF Outputs tab

**UX:**
- "Launch in AWS CloudFormation" button deep-links to the CF console with the template URL pre-loaded
- "Download template" for manual deploy
- User pastes `AccessKeyId` + `SecretAccessKey` from CF Outputs into Kibana
- Kibana validates credentials with a dry-run `resource-explorer-2:Search` call before enabling Continue
- Informational callout: these are temporary discovery credentials; the user will set up permanent credentials in Step 6 and should delete this stack after onboarding

> **Production path (A, post-POC):** Cross-account IAM role with trust to Elastic's AWS account. User deploys the stack, Elastic's backend assumes the role server-side — no credential copy-paste. The POC uses IAM user + access key (path B) for simplicity.

#### Step 3: Discover Infrastructure
Kibana backend calls AWS Resource Explorer. User sees a scan-in-progress state, then a results table.

**Backend call:** `POST /internal/security/cloud-integrations/aws/discover`
- Takes `{ accessKeyId, secretAccessKey }` — credentials go directly to backend, never stored in wizard state after this call
- Calls `resource-explorer-2:Search` with `QueryString="*"` grouped by `resourceType` + `region`
- **Fallback:** if Resource Explorer is not enabled, falls back to `cost-explorer:GetCostAndUsage` grouped by SERVICE; banner explains the limitation and recommends enabling Resource Explorer

**Results table columns:** AWS Service · Resource Type · Detected Regions · Count

User reviews the inventory and clicks Continue — no action required at this step.

---

### Phase 2 — Integrations

#### Step 4: Select Integrations
Discovered resource types are matched against a static mapping table (`aws_integration_mappings.ts`). Each entry maps:
```ts
{ resourceType: string, integration: 'aws', datastream: string, requiredInputs: InputDefinition[] }
```

**UX:**
- Matched integrations shown pre-checked in a table: Integration · Datastream · Match status · Detected regions
- Unmatched integrations hidden by default; toggle reveals the full AWS package list so users can add extras
- User can deselect any matched integration

---

### Phase 3 — Configure

#### Step 5: Additional Inputs
Only surfaces inputs that couldn't be auto-detected from the discovery scan. Regions and account IDs are pre-filled as editable chips.

**Examples of inputs surfaced here:**
- S3 Access Logs: S3 bucket ARN for the logging destination
- VPC Flow Logs: delivery method (CloudWatch Logs vs. S3) + log group name or bucket ARN

Integrations that were fully configured from discovery are acknowledged at the bottom ("✓ CloudTrail · GuardDuty · Security Hub — no additional inputs needed") so users know they're handled.

#### Step 6: Deployment Type & Auth
User chooses how agents will run. This choice gates the available authentication options.

**Option A — Elastic Managed (agentless):**
- Available on Elastic Cloud and Serverless only; card is hidden on self-managed deployments
- Auth options:
  - **Federated Identity (recommended):** CF stack creates an IAM role that trusts Elastic's AWS account (trust principal ARN embedded in template). User pastes the output Role ARN into Kibana. No long-lived credentials stored.
  - **IAM Access Key:** CF stack creates an IAM user with a least-privilege policy. User pastes access key + secret into Kibana.

**Option B — Agent-based:**
- Available on all deployment types
- Auth options:
  - **EC2 Instance Role (recommended on EC2):** CF stack creates an IAM role; user attaches it to the EC2 instance running the agent. No credentials to manage.
  - **IAM Access Key:** For agents running outside EC2 (on-prem, containers).
- Preview of the two-step agent install flow shown inline (CF stack deploy → agent enrollment command)

**CF template generation:**
- **Step 2 (discovery):** Static template bundled in the plugin — always the same two managed policies. Served as a direct download or deep-link URL.
- **Step 6 (production auth):** Assembled server-side: a base template + a dynamically computed IAM policy document scoped to exactly the permissions required by the user's selected integrations (from Step 4). Returned as a presigned URL or base64 download so the policy reflects the actual selection.

---

### Phase 4 — Deploy

#### Step 7: Deploy
**Elastic Managed path:**
- Kibana calls Fleet `createPackagePolicy` with `supports_agentless: true` for each selected integration
- Progress shown per integration: Queued → Provisioning → Online / Failed
- Failed integrations show inline error + Retry button; successful integrations are not rolled back
- User can continue to Step 8 with partial failures; failures can be retried later in Fleet

**Agent-based path:**
- Kibana creates an agent policy and enrollment token
- Step shows: enrollment command with token pre-filled, download link for the Elastic Agent, OS selector

#### Step 8: Confirmation
- Stat tiles: integrations online · regions covered · services discovered · first-data ETA
- Quick-links to relevant Security dashboards (CloudTrail, GuardDuty, SecurityHub, VPC Flow, Cloud Posture)
- Summary table: integration · status · regions
- Cleanup prompt: link to open the discovery CF stack (Step 2) in CloudFormation with a reminder to delete it
- "Set up another account" restarts the wizard; "Back to Security" returns to the onboarding hub

---

## Architecture

### Component tree

```
CloudOnboardingWizard          ← shell: sidebar stepper + scrollable content
  WizardStateProvider          ← React context; persisted to sessionStorage
    Step1ProviderSelect
    Step2DiscoveryAccess
    Step3InfraDiscovery
    Step4IntegrationSelect
    Step5AdditionalInputs
    Step6DeploymentAuth
    Step7Deploy
    Step8Confirmation
```

### File locations

```
security_solution/public/onboarding/components/onboarding_body/cards/
  cloud_integrations/
    index.tsx                        ← onboarding hub card
    cloud_onboarding_wizard.tsx      ← wizard shell
    wizard_state_provider.tsx        ← context + sessionStorage persistence
    aws_integration_mappings.ts      ← static mapping table
    steps/
      step1_provider_select.tsx
      step2_discovery_access.tsx
      step3_infra_discovery.tsx
      step4_integration_select.tsx
      step5_additional_inputs.tsx
      step6_deployment_auth.tsx
      step7_deploy.tsx
      step8_confirmation.tsx
    hooks/
      use_discovery.ts               ← wraps POST /internal/.../discover
      use_agentless_deployment.ts    ← wraps Fleet createPackagePolicy
```

### Backend route

`POST /internal/security/cloud-integrations/aws/discover`
- Input: `{ accessKeyId: string, secretAccessKey: string }`
- Calls Resource Explorer (fallback: Cost Explorer)
- Returns: `{ resources: Array<{ resourceType, service, regions, count }> }`
- Credentials are not logged or stored; not echoed in the response

### Wizard state shape

```ts
interface WizardState {
  provider: 'aws' | null;
  discoveryValidated: boolean;           // true after Step 2 dry-run passes
  discoveredResources: ResourceItem[];   // populated after Step 3
  selectedIntegrations: SelectedIntegration[];  // Step 4
  integrationInputs: Record<string, InputValues>;  // Step 5
  deploymentType: 'managed' | 'agent-based' | null;  // Step 6
  authType: 'federated' | 'access-key' | 'instance-role' | null;
  productionCredential: string | null;   // roleArn or keyId only — no secrets
  currentStep: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
}
```

Persisted to `sessionStorage` under key `elastic:cloud-onboarding-wizard`. Cleared on Step 8 completion or explicit "Start over".

On returning to `/app/security/cloud-onboarding`, the wizard detects existing state and offers "Resume where you left off" or "Start over".

---

## Error Handling

| Scenario | Handling |
|---|---|
| Resource Explorer not enabled | Auto-fallback to Cost Explorer; banner explains limitation, recommends enabling RE |
| Credential validation fails (Step 2) | Inline error with specific message before Continue is enabled |
| CF stack deploy abandoned mid-flow | "Check stack status" polling button; sessionStorage keeps wizard alive across navigation |
| Agentless unavailable (self-managed) | "Elastic Managed" card hidden entirely in Step 6 |
| Partial deploy failure (Step 7) | Failed integrations show error + Retry inline; flow continues to Step 8 |
| User exits mid-wizard | Resume offer on return; "Start over" clears state |

---

## Testing

**Unit tests (Jest):**
- `WizardStateProvider`: state transitions, sessionStorage persistence/restore, step validation guards
- `aws_integration_mappings.ts`: mapping correctness for all entries
- CF template generator: assert IAM policy contains exactly the right actions for a given integration selection + auth type

**API route test (Jest + mocked AWS SDK):**
- `POST .../discover`: mock Resource Explorer + Cost Explorer responses; assert normalized inventory shape; assert credentials not echoed in response

**Functional/E2E (Scout):**
- Happy path: Elastic Managed + Federated Identity, 3 integrations, agentless deploy succeeds
- Agent-based path: deployment card switches auth options correctly
- Resume: navigate away mid-wizard, return, verify step/state restored
- Error path: credential validation failure at Step 2 blocks Continue with correct error message

---

## Out of Scope (POC)

- Azure and GCP implementations (shell designed to support them)
- Resource Explorer contextual detection beyond binary service presence (planned for post-POC)
- Multi-account / AWS Organizations support
- Production cross-account IAM role path (path A) — documented above, deferred post-POC
