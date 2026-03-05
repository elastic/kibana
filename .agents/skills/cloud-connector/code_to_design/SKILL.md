---
name: cloud-connector-code-to-design
description: Capture running cloud connector UI from code (localhost, staging, production) and convert it into editable Figma designs. Use when the user wants to bring built UI into Figma for design review, iteration, side-by-side comparison, or team collaboration. Complements the design_to_code skill for round-trip workflows.
---

# Cloud Connector — Code to Design

Capture production or local cloud connector UI and bring it into Figma as editable frames for design iteration, team review, and round-trip development.

Based on the [Claude Code to Figma](https://www.figma.com/blog/introducing-claude-code-to-figma/) workflow.

## When to Use

- Built a feature in code and need design review before shipping
- Want to compare multiple UI states side-by-side on the Figma canvas
- Need to share work with designers/PMs without them running a local build
- Exploring variations — easier to duplicate frames than rewrite code
- Round-tripping: code → Figma → iterate → code

## Workflow

```
Step 1: New Task → Branch, bootstrap, start environment
Step 2: Run      → Start cloud connector UI locally
Step 3: Capture  → Screenshot / capture UI states from browser
Step 4: Push     → Send captures into Figma as editable frames
Step 5: Iterate  → Design team annotates, explores variations
Step 6: Return   → Round-trip back to code via Figma MCP
```

---

## Step 1: New Task Setup

Create a feature branch and prepare the dev environment before capturing UI.

Execute: `../scripts/cloud_connector_new_task.sh` (alias: `ccnew`)

This performs:
1. Verify on `main` branch
2. `git fetch upstream && git merge upstream/main`
3. Prompt for new branch name → `git checkout -b <name>`
4. Check/start Docker
5. `nvm use && yarn kbn bootstrap`
6. `yarn es serverless --projectType=security --kill`
7. `yarn serverless-security`

If you already have a branch and running environment, skip to Step 2.

## Step 2: Run the Cloud Connector UI

Verify Kibana is running at `http://localhost:5601`. If not:

```bash
ccrun
```

Navigate to the relevant cloud connector pages:
- Fleet > Agent policies > Create integration > Cloud Security Posture
- Fleet > Cloud connectors (management view)
- Add integration flow with AWS/Azure/GCP credential forms

## Step 3: Capture UI States

Use the browser MCP tools to navigate and capture the cloud connector UI.

**Step 3a: Navigate to the target page**

Use `browser_navigate` to open the cloud connector form or management page:
```
http://localhost:5601/app/fleet/cloud_connectors
http://localhost:5601/app/integrations/detail/cloud_security_posture/add-integration
```

**Step 3b: Take snapshots**

Use `browser_snapshot` to capture the current page state. Interact with the page to reach different states.

Key states to capture for cloud connector:
- New connection form (empty state)
- New connection form (filled — AWS)
- New connection form (filled — Azure)
- New connection form (filled — GCP)
- Existing connection tab with connector selector dropdown
- Connector selector with connectors listed
- CloudFormation / ARM Template / Cloud Shell setup guides
- Cloud connector management list view
- Edit connector flyout
- Policies using connector flyout
- Error states (validation failures)
- Organization vs single-account toggle

**Step 3c: Capture multi-step flows**

For flows, capture screens in sequence to preserve context:
1. Integration selection page
2. Credential type selection
3. Cloud connector form (new)
4. Form filled with credentials
5. Success / confirmation state

## Step 4: Push to Figma

Use the Figma MCP tools to create or update design frames.

**Step 4a: Get the target Figma file**

Ask the user:

```
Where should the captures go?
  a) I have a Figma file URL
  b) Create frames — I'll paste them manually
```

**Step 4b: Compare against existing designs**

If updating an existing Figma design, use `get_screenshot` on the current design node to compare against the live UI.

**Step 4c: Generate design context**

Use `get_design_context` on existing Figma components to understand the design system in use, then map captured UI elements to those patterns.

**Step 4d: Add Code Connect mappings**

Link Figma nodes back to source code with `add_code_connect_map`:

| Figma Node | Source Component |
|------------|-----------------|
| Setup form | `cloud_connector_setup.tsx` |
| New form | `form/new_cloud_connector_form.tsx` |
| Reusable form | `form/reusable_cloud_connector_form.tsx` |
| Connector selector | `form/cloud_connector_selector.tsx` |
| Name field | `form/cloud_connector_name_field.tsx` |
| Input fields | `form/cloud_connector_input_fields.tsx` |
| AWS form | `aws_cloud_connector/aws_cloud_connector_form.tsx` |
| Azure form | `azure_cloud_connector/azure_cloud_connector_form.tsx` |
| GCP form | `gcp_cloud_connector/gcp_cloud_connector_form.tsx` |
| AWS CloudFormation | `aws_cloud_connector/aws_cloud_formation_guide.tsx` |
| Azure ARM Template | `azure_cloud_connector/azure_arm_template_guide.tsx` |
| GCP Cloud Shell | `gcp_cloud_connector/gcp_cloud_shell_guide.tsx` |
| Policies flyout | `cloud_connector_policies_flyout/index.tsx` |
| Account badge | `components/account_badge.tsx` |
| Integration badge | `components/integration_count_badge.tsx` |

All paths relative to `fleet/public/components/cloud_connector/`.

Example `add_code_connect_map` call:
```
nodeId: <figma-node-id>
fileKey: <figma-file-key>
source: x-pack/platform/plugins/shared/fleet/public/components/cloud_connector/cloud_connector_setup.tsx
componentName: CloudConnectorSetup
label: React
```

## Step 5: Iterate in Figma

Once frames are on the canvas, the team can:

- **Compare side-by-side** — lay out all states to spot inconsistencies
- **Explore variations** — duplicate frames, try alternative layouts without rewriting code
- **Annotate decisions** — designers and PMs comment directly on frames
- **Check design system alignment** — verify EUI component usage and spacing

### Design Review Checklist

- [ ] All cloud provider forms follow consistent layout
- [ ] Error states are clear and actionable
- [ ] Secret fields are visually distinct from non-secret fields
- [ ] Setup guides (CloudFormation/ARM/Cloud Shell) are scannable
- [ ] Reusable connector selector is intuitive
- [ ] Account badge and integration count are readable
- [ ] Form works at different viewport widths
- [ ] Accessibility: contrast, focus states, screen reader flow

## Step 6: Round-Trip Back to Code

After design iteration, bring changes back to code using the Figma MCP server.

**Step 6a:** Use `get_design_context` on the iterated Figma frames to extract updated UI code.

**Step 6b:** Use `get_variable_defs` to pull any updated design tokens.

**Step 6c:** Use `get_code_connect_map` to find which Figma components link to code — update existing source files.

**Step 6d:** Load the [kibana_engineer](../kibana_engineer/SKILL.md) skill for architecture context. Apply design updates to `fleet/public/components/cloud_connector/`.

**Step 6e:** Run Kibana locally (`ccrun`) and compare the updated UI against the Figma frames using `browser_snapshot`.

---

## Round-Trip Loop

```
code_to_design (this skill)          design_to_code (sibling skill)
─────────────────────────           ─────────────────────────────
1. New task (branch + env)           1. Extract design from Figma
2. Build feature in code             2. Create branch + environment
3. Capture UI from browser           3. Implement with arch context
4. Push to Figma as frames           4. Validate cross-repo
5. Team iterates on design           5. Test and ship
        │                                    │
        └────── Figma canvas ───────────────┘
```

Use `code_to_design` when you've built something that needs design polish.
Use `design_to_code` when starting from a Figma mockup.

---

## Quick Reference

| Resource | Path |
|----------|------|
| Design to code skill | `../design_to_code/SKILL.md` |
| Kibana engineer skill | `../kibana_engineer/SKILL.md` |
| QA engineer skill | `../qa_engineer/SKILL.md` |
| New task script | `../scripts/cloud_connector_new_task.sh` |
| Run Kibana script | `../scripts/cloud_connector_run_kibana_serverless.sh` |
| UI components | `fleet/public/components/cloud_connector/` |
| [Claude Code to Figma](https://www.figma.com/blog/introducing-claude-code-to-figma/) | Figma blog post |
| [Figma MCP server](https://www.figma.com/developers/mcp) | MCP developer docs |
