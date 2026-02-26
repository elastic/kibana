# SDH Investigation Commands

Reference commands for each investigation step. Replace `ISSUE`, `REPO`, `TOKEN`, `URL` with actual values.

## Step 0: Setup

```bash
# Ensure artifacts dir is gitignored
grep -qxF '.cursor/sdh/' .gitignore 2>/dev/null || echo '.cursor/sdh/' >> .gitignore

# Check for prior report
ls -la .cursor/sdh/ISSUE/sdh_report_* 2>/dev/null
```

## Step 1: Read Issue & Download Artifacts

```bash
# Read issue — filter out bots, get human comments
gh issue view ISSUE --repo REPO --json title,state,labels,body,comments \
  | jq '{
    title: .title,
    state: .state,
    labels: [.labels[].name],
    body: .body,
    comments: [.comments[] | select(.author.login | test("bot|elasticmachine|kibanamachine") | not) | {author: .author.login, date: .createdAt, body: .body}]
  }'
```

```bash
# Download artifacts
mkdir -p .cursor/sdh/ISSUE
cd .cursor/sdh/ISSUE
```

Artifacts in SDH issues appear in two formats. Parse the issue body and comments, then download each artifact.

**Format A — curl command (run as-is from the artifacts directory):**

```
curl -L -H 'Authorization: TOKEN' -o 'filename.har' https://upload.elastic.co/d/HASH
```

**Format B — structured text (construct the curl command):**

```
File name: example.har
You can download the file here: https://upload.elastic.co/d/HASH
Use this Authorization Token: TOKEN
```

→ `curl -L -H 'Authorization: TOKEN' -o 'example.har' https://upload.elastic.co/d/HASH`

**Rules:**
- Skip files already present in the artifacts directory
- Extract archives after downloading:

```bash
unzip -q -o archive.zip -d extracted_name 2>/dev/null
tar -xzf archive.tar.gz -C extracted_name 2>/dev/null
```

## Step 2: List Artifacts

```bash
find .cursor/sdh/ISSUE/ -type f -exec du -sh {} \; | sort -rh
```

## Step 3: Search GitHub

```bash
# Limit searches to the last 12 months
gh search issues "symptom keywords" --repo REPO --limit 10 --created ">$(date -v-1y +%Y-%m-%d)"
gh search issues "error message" --repo elastic/kibana --limit 10 --created ">$(date -v-1y +%Y-%m-%d)"
gh search prs "component-name fix" --repo elastic/kibana --state closed --limit 10 --created ">$(date -v-1y +%Y-%m-%d)"
```

## Step 4: Code Search

```bash
# Read PR diff for a specific file
gh pr diff NUMBER --repo elastic/kibana -- path/to/file.ts
```

## Step 5: Archive Prior Report

```bash
mv .cursor/sdh/ISSUE/sdh_report_ISSUE.md .cursor/sdh/ISSUE/sdh_report_ISSUE_$(date +%Y-%m-%d_%H%M).md 2>/dev/null
```
