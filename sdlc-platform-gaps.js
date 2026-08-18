'use strict';
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat, PageBreak, TableOfContents,
} = require('/Users/yuliianaumenko/.nvm/versions/node/v20.20.2/lib/node_modules/docx');

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  navy:   '1B3A6B', blue:   '2E6FBF', teal:   '0E7C7B',
  green:  '2D6A2D', purple: '5B2D8E', orange: 'B85C00',
  red:    'A61C00', gray1:  'F5F7FA', gray2:  'E8ECF2',
  gray3:  'D0D7E3', gray4:  '6B7280', white:  'FFFFFF', black: '111111',
  p0_bg:  'FDECEC', p0_bd:  'A61C00',
  p1_bg:  'FEF4E7', p1_bd:  'B85C00',
  p2_bg:  'EDF4FF', p2_bd:  '2E6FBF',
  p3_bg:  'F0F9F0', p3_bd:  '2D6A2D',
  done_bg:'E8F5E9', done_bd:'2D6A2D',
};

const PAGE_W = 12240, PAGE_H = 15840, MARGIN = 1080;
const CW = PAGE_W - 2 * MARGIN; // 10080

function bdr(color = C.gray3) { return { style: BorderStyle.SINGLE, size: 1, color }; }
function bdrs(c = C.gray3) { const b = bdr(c); return { top:b, bottom:b, left:b, right:b }; }

function cell(children, w, opts = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: bdrs(opts.bc || C.gray3),
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 130, right: 130 },
    verticalAlign: VerticalAlign.TOP,
    children,
  });
}

function hcell(text, w, fill = C.gray2, textColor = C.navy) {
  return cell([new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: textColor, font: 'Arial' })] })], w, { fill });
}

function p(children, opts = {}) {
  const runs = typeof children === 'string'
    ? [new TextRun({ text: children, font: 'Arial', size: opts.size || 21, color: opts.color || C.black, bold: opts.bold, italics: opts.italic })]
    : children;
  return new Paragraph({
    children: runs,
    spacing: { before: opts.before ?? 60, after: opts.after ?? 60, line: 276 },
    alignment: opts.align,
  });
}

function bullet(text, opts = {}) {
  return new Paragraph({
    numbering: { reference: opts.sub ? 'sub-bullets' : 'bullets', level: 0 },
    children: [new TextRun({ text, font: 'Arial', size: opts.size || 20, color: opts.color || C.black, bold: opts.bold })],
    spacing: { before: 30, after: 30 },
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: 'Arial', bold: true, size: 36, color: C.navy })], spacing: { before: 320, after: 140 } });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: 'Arial', bold: true, size: 28, color: C.blue })], spacing: { before: 240, after: 100 } });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: 'Arial', bold: true, size: 24, color: C.teal })], spacing: { before: 180, after: 70 } });
}
function newPage() { return new Paragraph({ children: [new PageBreak()] }); }
function sp(n = 1) { return new Paragraph({ children: [], spacing: { before: 0, after: n * 100 } }); }
function rule() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.blue, space: 1 } },
    spacing: { before: 80, after: 80 }, children: [],
  });
}

// ── Priority badge ────────────────────────────────────────────────────────────
const PRIO_COLORS = {
  'P0': { bg: C.p0_bg, bd: C.p0_bd, text: C.p0_bd },
  'P1': { bg: C.p1_bg, bd: C.p1_bd, text: C.p1_bd },
  'P2': { bg: C.p2_bg, bd: C.p2_bd, text: C.p2_bd },
  'P3': { bg: C.p3_bg, bd: C.p3_bd, text: C.p3_bd },
  'Done': { bg: C.done_bg, bd: C.done_bd, text: C.done_bd },
};

// ── Gap card ─────────────────────────────────────────────────────────────────
// Renders a single gap as a bordered box with ID, title, metadata strip, then sections
function gapCard(id, title, prio, effort, area, files, deps, current, required, criteria) {
  const pc = PRIO_COLORS[prio] || PRIO_COLORS['P2'];
  const statusLabel = prio === 'Done' ? '✓ Done in sdlc-poc' : prio;

  // Metadata strip (one row: ID | Priority | Effort | Area | Deps)
  const metaCols = [1100, 900, 700, 3200, 4180];
  const metaRow = new TableRow({ children: [
    cell([p(id, { size: 18, bold: true, color: C.navy })], metaCols[0], { fill: C.gray1 }),
    cell([p(statusLabel, { size: 18, bold: true, color: pc.text })], metaCols[1], { fill: pc.bg, bc: pc.bd }),
    cell([p(effort, { size: 18 })], metaCols[2], { fill: C.gray1 }),
    cell([p(area, { size: 18, color: C.gray4 })], metaCols[3], { fill: C.gray1 }),
    cell([p(deps || '—', { size: 18, color: C.gray4 })], metaCols[4], { fill: C.gray1 }),
  ] });

  // Title row
  const titleRow = new TableRow({ children: [
    new TableCell({
      columnSpan: 5,
      width: { size: CW, type: WidthType.DXA },
      borders: bdrs(pc.bd),
      shading: { fill: pc.bg, type: ShadingType.CLEAR },
      margins: { top: 90, bottom: 90, left: 160, right: 160 },
      children: [new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 22, color: pc.text, font: 'Arial' })] })],
    }),
  ] });

  // Body sections: Current / Required / AC / Files
  const bodyCols = [1600, 8480];
  function bodyRow(label, content, color = C.black) {
    return new TableRow({ children: [
      cell([p(label, { size: 17, bold: true, color: C.gray4 })], bodyCols[0], { fill: C.gray1 }),
      cell([p(content, { size: 19, color })], bodyCols[1]),
    ] });
  }

  const filesList = Array.isArray(files) ? files.join('\n') : files;

  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: metaCols,
    rows: [
      titleRow,
      metaRow,
      bodyRow('Current', current),
      bodyRow('Required', required),
      bodyRow('Accepts when', criteria),
      bodyRow('Files', filesList, C.blue),
    ],
  });
}

// ── Section header band ───────────────────────────────────────────────────────
function sectionBand(text, color = C.navy) {
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CW, type: WidthType.DXA },
      borders: bdrs(color),
      shading: { fill: color, type: ShadingType.CLEAR },
      margins: { top: 90, bottom: 90, left: 200, right: 200 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 24, color: C.white, font: 'Arial' })] })],
    })] })],
  });
}

// ── Summary table ─────────────────────────────────────────────────────────────
function summaryTable(rows) {
  const cols = [1200, 1000, 700, 700, 6480];
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({ children: [
        hcell('ID', cols[0]), hcell('Priority', cols[1]), hcell('Effort', cols[2]),
        hcell('Status', cols[3]), hcell('Title', cols[4]),
      ], tableHeader: true }),
      ...rows.map(([id, prio, effort, status, title]) => {
        const pc = PRIO_COLORS[prio] || PRIO_COLORS['P2'];
        return new TableRow({ children: [
          cell([p(id, { size: 18, bold: true, color: C.navy })], cols[0]),
          cell([p(prio, { size: 18, bold: true, color: pc.text })], cols[1], { fill: pc.bg }),
          cell([p(effort, { size: 18 })], cols[2]),
          cell([p(status, { size: 18 })], cols[3],
            { fill: status === 'Done' ? C.done_bg : status === 'New' ? C.p2_bg : C.p1_bg }),
          cell([p(title, { size: 18 })], cols[4]),
        ] });
      }),
    ],
  });
}

// ════════════════════════════════════════════════════════════════════════════
// GAP DATA
// ════════════════════════════════════════════════════════════════════════════

// ── FLEET ────────────────────────────────────────────────────────────────────
const fleetGaps = [
  gapCard(
    'FLEET-001',
    '[Fleet/EPM] Add KibanaAssetType.workflow + KibanaSavedObjectType.workflow to Fleet EPM',
    'Done', 'S', 'Fleet / EPM  (epm.ts)', [
      'x-pack/platform/plugins/shared/fleet/common/types/models/epm.ts',
    ], '—',
    'KibanaAssetType enum has no "workflow" variant. Fleet cannot register, track, or manage workflow assets installed from a package.',
    'Add workflow = "workflow" to KibanaAssetType enum and KibanaSavedObjectType enum. Add CREATE_WORKFLOW_ASSETS install state. Enables any Fleet package to ship kibana/workflow/ YAML assets.',
    'Fleet EPM successfully installs a package containing kibana/workflow/*.yaml, records asset refs with type=workflow, and lists them under the package\'s installed assets.',
    [{
      'x-pack/platform/plugins/shared/fleet/common/types/models/epm.ts': 'KibanaAssetType + KibanaSavedObjectType enums, INSTALL_STATES enum',
    }],
  ),
  gapCard(
    'FLEET-002',
    '[Fleet/EPM] Implement stepInstallWorkflowAssets — read kibana/workflow/*.yaml from package zip, substitute connector IDs, create/update via workflowsManagement plugin',
    'Done', 'M', 'Fleet / EPM  (install step)', [
      'x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/steps/step_install_workflow_assets.ts',
      'x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/_state_machine_package_install.ts',
      'x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/steps/index.ts',
    ], 'FLEET-001',
    'No install step exists for workflow assets. Workflows in kibana/workflow/ inside a package zip are silently ignored at install time.',
    'New step stepInstallWorkflowAssets: (1) traverses kibana/workflow/ entries in archive, (2) calls substituteWorkflowConnectorIds to replace REPLACE_WITH_* placeholders from policy vars, (3) upserts via workflowsManagement.createWorkflow/updateWorkflow, (4) saves KibanaAssetReference records. Concurrency: 3 parallel installs. Graceful skip when workflowsManagement plugin unavailable.',
    'A Fleet package containing kibana/workflow/*.yaml installs all workflows with connector IDs substituted from policy vars. Reinstall updates existing workflows. Workflows are listed in the package\'s installed assets.',
    [],
  ),
  gapCard(
    'FLEET-003',
    '[Fleet/EPM] Delete workflow assets on package uninstall via workflowsManagement plugin',
    'Done', 'S', 'Fleet / EPM  (remove.ts)', [
      'x-pack/platform/plugins/shared/fleet/server/services/epm/packages/remove.ts',
    ], 'FLEET-001, FLEET-002',
    'Package uninstall calls deleteKibanaAssets() which uses SO bulk delete. Workflows are not Kibana saved objects — they live in the Workflows plugin\'s own storage. Standard SO delete leaves orphaned workflow records.',
    'In remove.ts deleteKibanaAssets: separate workflow-typed assets, call workflowsManagement.deleteWorkflows(ids, spaceId). Graceful fallback if plugin unavailable. Mirror pattern for agent assets.',
    'Uninstalling a Fleet package removes all associated workflows from the Workflows plugin storage. Re-install from a clean state creates fresh workflows.',
    [],
  ),
  gapCard(
    'FLEET-004',
    '[Fleet/EPM] Register workflowsManagement as optional Fleet plugin dependency',
    'Done', 'S', 'Fleet / plugin wiring', [
      'x-pack/platform/plugins/shared/fleet/kibana.jsonc',
      'x-pack/platform/plugins/shared/fleet/server/plugin.ts',
      'x-pack/platform/plugins/shared/fleet/server/services/app_context.ts',
      'x-pack/platform/plugins/shared/fleet/tsconfig.json',
    ], '—',
    'Fleet has no dependency on workflowsManagement plugin. The plugin API is not available at install time.',
    'Add workflowsManagement to Fleet\'s optionalPlugins in kibana.jsonc. Wire dep in plugin.ts setup: appContextService.setWorkflowsManagementSetup(deps.workflowsManagement). Add WorkflowsServerPluginSetup to FleetSetupDeps type. Add @kbn/workflows-management-plugin to tsconfig references.',
    'Fleet plugin setup receives workflowsManagement when the Workflows plugin is present. Steps that call appContextService.getWorkflowsManagementSetup() receive a non-null value.',
    [],
  ),
  gapCard(
    'FLEET-005',
    '[Fleet/EPM] Add KibanaAssetType.agent + stepInstallAgentAssets — ship Agent Builder agents in Fleet packages',
    'Done', 'M', 'Fleet / EPM  (agent assets)', [
      'x-pack/platform/plugins/shared/fleet/common/types/models/epm.ts',
      'x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/steps/step_install_agent_assets.ts',
      'x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/_state_machine_package_install.ts',
      'x-pack/platform/plugins/shared/fleet/server/services/app_context.ts',
      'x-pack/platform/plugins/shared/fleet/kibana.jsonc',
    ], 'FLEET-001',
    'Fleet has no mechanism to install Agent Builder agents from a package. Packages cannot ship pre-configured agents in kibana/agent/.',
    'Add agent = "agent" to KibanaAssetType. Add CREATE_AGENT_ASSETS install state before CREATE_WORKFLOW_ASSETS. Implement stepInstallAgentAssets: reads kibana/agent/*.yaml, substitutes REPLACE_WITH_* placeholders, calls agentBuilderManagement.createOrUpdateAgent(). Register agentBuilder as optional Fleet plugin dep. Handle deletion in remove.ts via agentBuilderManagement.deletePackageManagedAgent().',
    'A Fleet package containing kibana/agent/*.yaml installs all agents with connector IDs substituted. Uninstall removes them. Agents are listed in the package\'s installed assets.',
    [],
  ),
  gapCard(
    'FLEET-006',
    '[Fleet/EPM] Add KibanaAssetType.knowledgeEntry + stepInstallKnowledgeEntries — ship AI Assistant knowledge in Fleet packages',
    'New', 'M', 'Fleet / EPM  (knowledge assets)', [
      'x-pack/platform/plugins/shared/fleet/common/types/models/epm.ts',
      'x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/steps/step_install_knowledge_assets.ts  (new)',
      'x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/_state_machine_package_install.ts',
      'x-pack/platform/plugins/shared/fleet/server/services/epm/packages/remove.ts',
      'x-pack/platform/plugins/shared/fleet/server/services/app_context.ts',
      'x-pack/platform/plugins/shared/fleet/kibana.jsonc',
    ], '—',
    'No knowledgeEntry variant in KibanaAssetType. Fleet cannot install AI Assistant knowledge entries from a package. Files in kibana/knowledge_entry/ are ignored.',
    'Add knowledgeEntry = "knowledge_entry" to KibanaAssetType + KibanaSavedObjectType. Add CREATE_KNOWLEDGE_ASSETS install state. Implement stepInstallKnowledgeAssets: reads kibana/knowledge_entry/*.md from archive, calls aiAssistantManagement.createKnowledgeEntry(). Register aiAssistantManagement as optional Fleet plugin dep. Handle deletion in remove.ts.',
    'A Fleet package containing kibana/knowledge_entry/*.md installs entries into the AI Assistant knowledge base. Uninstall removes them. Entries appear in the package\'s installed assets list.',
    [],
  ),
  gapCard(
    'FLEET-007',
    '[Fleet UI] Display workflow, agent, and knowledge-entry asset types in installed package detail view',
    'New', 'S', 'Fleet / public  (UI constants + accordion)', [
      'x-pack/platform/plugins/shared/fleet/public/applications/integrations/sections/epm/constants.tsx',
      'x-pack/platform/plugins/shared/fleet/public/applications/integrations/sections/epm/screens/detail/assets/assets_accordion.tsx  (if applicable)',
    ], 'FLEET-001, FLEET-005, FLEET-006',
    'AssetTitleMap in constants.tsx (lines ~100–139) has no entries for workflow, agent, or knowledge_entry. The assets accordion skips asset types it cannot resolve a display label for. These assets are installed but invisible in the Fleet UI.',
    'Add i18n-labeled entries to AssetTitleMap for workflow ("Workflows"), agent ("Agents"), and knowledge_entry ("Knowledge entries"). Ensure assets_accordion.tsx renders them alongside existing asset types (dashboards, visualizations, etc.).',
    'After installing a package that ships workflows, agents, and knowledge entries, the Fleet integration detail page shows those assets grouped under their respective section headers with correct counts.',
    [],
  ),
  gapCard(
    'FLEET-008',
    '[Fleet/EPM] Validate connector ID manifest vars against existing connectors at policy save time',
    'New', 'M', 'Fleet / policy validation', [
      'x-pack/platform/plugins/shared/fleet/server/services/package_policy.ts  (or policy validation middleware)',
    ], 'FLEET-002',
    'Manifest vars of type text named *_connector_id are stored and substituted as plain strings. Fleet does not validate that they reference an existing Kibana connector. Misconfigured IDs fail silently at workflow runtime.',
    'Introduce a var type: connector_id (or meta annotation) in the manifest schema. At policy save time, Fleet validates that the provided value matches an existing Kibana action connector saved object in the target space. Return a validation error if the connector does not exist.',
    'Saving a Fleet policy with an invalid connector_id var returns a 400 with a descriptive error. Saving with a valid connector ID succeeds. Existing text vars are unaffected.',
    [],
  ),
  gapCard(
    'FLEET-009',
    '[Fleet/EPM] Surface install-time workflow YAML validation errors in the Fleet install response',
    'New', 'S', 'Fleet / error handling', [
      'x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/steps/step_install_workflow_assets.ts',
    ], 'FLEET-002',
    'If workflowsManagement.createWorkflow() rejects due to invalid YAML (schema error, unknown step type, etc.), the error is caught and logged but the package install succeeds with a partial state. The user has no visibility into which workflows failed.',
    'Collect per-workflow errors from createWorkflow/updateWorkflow calls. If any workflow fails validation, include the errors in the install response warnings array. Do not fail the entire install for a single workflow YAML error — mark that workflow\'s asset ref with status: "failed" and surface the error message.',
    'Installing a package with one invalid workflow YAML and one valid YAML installs the valid workflow, and the install response includes a warning listing the invalid workflow and the validation error. The Fleet UI shows the partial install state.',
    [],
  ),
];

// ── WORKFLOWS ────────────────────────────────────────────────────────────────
const wfGaps = [
  gapCard(
    'WF-001',
    '[Workflows] Add workflow.checkpoint built-in step type — read/write durable run state without raw elasticsearch.search/index',
    'New', 'M', 'kbn-workflows  (step definitions)', [
      'src/platform/packages/shared/kbn-workflows/spec/builtin_step_definitions.ts',
    ], '—',
    'Workflows that need cross-run state (incremental sync cursors, watermarks, run counts) must implement their own checkpoint pattern using raw elasticsearch.search and elasticsearch.index steps. This is a multi-step boilerplate block in every ingest workflow, is fragile, and couples workflows to a specific index schema.',
    'Add workflow.checkpoint step type with two operations: read (returns checkpoint fields as output variables) and write (persists key/value pairs to durable storage). The step abstracts the Elasticsearch storage behind a first-class primitive. Schema: { type: workflow.checkpoint, operation: read | write, key: string, fields: record }.',
    'A workflow using workflow.checkpoint.read at start and workflow.checkpoint.write at end persists cursor and watermark across runs without any elasticsearch.search/index steps. The checkpoint is scoped to the workflow ID and space.',
    [],
  ),
  gapCard(
    'WF-002',
    '[Workflows] Add data.extract built-in step type — regex / GROK extraction from string fields',
    'New', 'M', 'kbn-workflows  (step definitions)', [
      'src/platform/packages/shared/kbn-workflows/spec/builtin_step_definitions.ts',
    ], '—',
    'Workflows that need to extract substrings (e.g., a Salesforce case number from an issue body, a Google Drive file ID from a URL) must use a connector action or javascript expression workaround. There is no first-class extraction primitive.',
    'Add data.extract step type supporting named capture groups via regex pattern or GROK pattern syntax. Output: { matched: boolean, groups: record<string,string> }. Schema: { type: data.extract, source: string (template), pattern: string, grok: boolean? }.',
    'A workflow step with type data.extract and a named capture group regex successfully extracts a substring from a Liquid template expression and sets the captured value as a variable accessible to subsequent steps.',
    [],
  ),
  gapCard(
    'WF-003',
    '[Workflows] Promote workflow.executeAsync from tech_preview to GA',
    'New', 'M', 'kbn-workflows  (step definitions)', [
      'src/platform/packages/shared/kbn-workflows/spec/builtin_step_definitions.ts  (line 277: stability: tech_preview)',
    ], '—',
    'workflow.executeAsync (fire-and-forget async sub-workflow invocation) is marked stability: tech_preview. Packages cannot ship production workflows that depend on it. Tier 5 agentic workflows require non-blocking sub-workflow dispatch.',
    'Remove the stability: "tech_preview" annotation from the workflow.executeAsync step definition after completing API stabilization review. Document the step in the kbn-workflows spec examples and changelog.',
    'A workflow spec file using workflow.executeAsync passes YAML validation without warnings. The step is documented in the public kbn-workflows spec. Packages shipping it install without deprecation warnings.',
    [],
  ),
  gapCard(
    'WF-004',
    '[Workflows] Expose package tag on workflow execution records — enable Fleet to query runs by integration',
    'New', 'S', 'kbn-workflows  (execution model)', [
      'src/platform/packages/shared/kbn-workflows/ (execution index mapping)',
      'x-pack/platform/plugins/shared/fleet/ (Ingest Health dashboard ES|QL query)',
    ], 'FLEET-002',
    'Workflow runs are queryable by workflowId. The Fleet package name is encoded in the workflowId prefix (fleet-{spaceId}-{pkgName}-{name}) but there is no indexed package_name or tags field on execution records. Dashboard queries cannot filter runs by integration without brittle prefix matching.',
    'Add a package_name field (and optionally tags[]) to the workflow execution index mapping. Populate it from the workflow\'s tags array at execution start. The Fleet install step already writes tags: [sdlc, ...] from the YAML. This field enables Ingest Health dashboards to filter executions by Fleet package without string parsing.',
    'An ES|QL query on the workflow execution index filtering by package_name = "sdlc_intel" returns only runs for that integration\'s workflows. The Ingest Health dashboard uses this filter.',
    [],
  ),
  gapCard(
    'WF-005',
    '[Workflows] Add concurrency.strategy: queue — allow sequential execution of overlapping workflow runs',
    'New', 'L', 'kbn-workflows  (concurrency model)', [
      'src/platform/packages/shared/kbn-workflows/spec/ (concurrency schema)',
    ], '—',
    'concurrency.strategy supports drop (skip new run if one is already running) and replace (cancel running, start new). There is no queue strategy. Long-running Tier 2 activity workflows that exceed their 30-minute schedule interval are silently dropped, potentially causing data gaps.',
    'Add concurrency.strategy: queue with configurable max_queued (default 1). When a workflow is already running and a new trigger fires, the new run is queued rather than dropped. When the running instance completes, the queued run starts automatically. Limit queue depth to prevent unbounded accumulation.',
    'A workflow with concurrency: { strategy: queue, max: 1, max_queued: 1 } does not drop scheduled runs when the previous run is still executing. The second trigger fires immediately after the first completes. A third trigger while both first and second are active/queued is dropped.',
    [],
  ),
  gapCard(
    'WF-006',
    '[Workflows] Document and formalize the shouldBackoff rate-limit signal contract for connector actions',
    'New', 'S', 'kbn-connector-specs  (ActionDefinition) + kbn-workflows  (spec docs)', [
      'src/platform/packages/shared/kbn-connector-specs/src/connector_spec.ts',
      'src/platform/packages/shared/kbn-workflows/spec/examples/ (example workflows)',
    ], '—',
    'shouldBackoff: boolean is returned ad-hoc by specific connector actions (GitHub runQueryTemplate) as an output field convention. It is not defined in ActionDefinition, not validated, and not documented as a standard contract. Other connectors implement rate-limit handling differently or not at all.',
    'Add an optional shouldBackoff?: boolean field to the ActionDefinition output schema in ConnectorSpec. Document the semantics: when true, the calling workflow should pause before the next page fetch. Add a shouldBackoffAfter?: number (seconds) hint field. Update kbn-workflows spec docs with the canonical wait-if-shouldBackoff pattern. All ingest-plane connector actions should adopt this contract.',
    'A connector action that returns shouldBackoff: true in its response is consumed correctly by a workflow using the documented pattern. The ConnectorSpec type includes shouldBackoff in the action output type. kbn-connector-specs tests verify the field is returned when rate limit is low.',
    [],
  ),
];

// ── CONNECTOR V2 ─────────────────────────────────────────────────────────────
const connGaps = [
  gapCard(
    'CONN-001',
    '[Connector V2] Formally define and document isTool: false as the ingest-plane action contract',
    'New', 'S', 'kbn-connector-specs  (spec + docs)', [
      'src/platform/packages/shared/kbn-connector-specs/src/connector_spec.ts',
      'src/platform/packages/shared/kbn-connector-specs/README.md  (or docs/)',
    ], '—',
    'isTool?: boolean exists in ActionDefinition (line 207) and isToolAction() helper exists (line 324). However, the semantics of isTool: false — that the action is workflow-only, not exposed to Agent Builder, intended for bulk ingest — are undocumented. Connector authors may misuse the flag or omit it.',
    'Add JSDoc to ActionDefinition.isTool: clarify that isTool: true = agent-facing (appears in Agent Builder tool picker), isTool: false = workflow-only ingest primitive (not shown to agents). Add a connector-authoring guide section covering when to use each. Add a lint/test rule that ingest-plane actions (those with pagination params like nextPageToken, cursor, after) must set isTool: false.',
    'A new connector PR with a paginated ingest action missing isTool: false fails the spec lint check with a descriptive error. Existing ingest-plane actions (runQueryTemplate, soqlIngest, listFilesIngest) all have isTool: false.',
    [],
  ),
  gapCard(
    'CONN-002',
    '[Connector V2] Add GitHub ingest-plane actions: runQueryTemplate, graphqlQuery, listQueryTemplates',
    'Done', 'M', 'kbn-connector-specs  (.github)', [
      'src/platform/packages/shared/kbn-connector-specs/src/specs/github/github.ts',
      'src/platform/packages/shared/kbn-connector-specs/src/specs/github/graphql/templates.ts  (new)',
      'src/platform/packages/shared/kbn-connector-specs/src/specs/github/graphql/templates.test.ts  (new)',
    ], 'CONN-001',
    'The .github connector exposes agent-facing actions (search, getIssue, createIssue, etc.) but no ingest-plane actions. Bulk org-wide data ingestion requires multiple raw graphqlQuery calls with manual cursor management and no template reuse.',
    'Add three isTool: false actions: (1) runQueryTemplate — executes a named template from a built-in registry of 11 org-level GraphQL queries, handles pagination via pageInfo cursor, returns { data, pageInfo, rateLimit, shouldBackoff }. (2) graphqlQuery — executes an arbitrary read-only GraphQL query, rejects mutations. (3) listQueryTemplates — returns all template IDs with descriptions.',
    'A workflow using github.runQueryTemplate with templateId: orgCatalog.teams pages through all org teams with cursor-based pagination. shouldBackoff: true is returned when rateLimit.remaining < threshold. Mutation queries submitted to graphqlQuery are rejected with a clear error.',
    [],
  ),
  gapCard(
    'CONN-003',
    '[Connector V2] Add Slack ingest-plane actions: listUsers, getChannelHistory, getConversationReplies',
    'Done', 'M', 'kbn-connector-specs  (.slack2)', [
      'src/platform/packages/shared/kbn-connector-specs/src/specs/slack/slack.ts',
      'src/platform/packages/shared/kbn-connector-specs/src/specs/slack/types.ts',
    ], 'CONN-001',
    'The .slack2 connector exposes agent-facing actions (postMessage, listChannels) but no ingest-plane actions. There is no way for a workflow to fetch message history, user lists, or thread replies.',
    'Add three isTool: false actions: (1) listUsers — paginated users.list, filters bots/deleted by default, returns { users, nextCursor, hasMore }. (2) getChannelHistory — conversations.history with oldest/latest timestamp watermark support and cursor pagination. (3) getConversationReplies — conversations.replies for a given thread_ts. Extend OAuth scopes: channels:history, groups:history, im:history.',
    'A workflow using slack2.getChannelHistory with oldest = last watermark timestamp returns only messages newer than that timestamp. nextCursor pagination works across multiple calls. Bot messages are excluded when includeBots: false.',
    [],
  ),
  gapCard(
    'CONN-004',
    '[Connector V2] Add Salesforce ingest-plane action: soqlIngest — paginated SOQL with nextRecordsUrl',
    'Done', 'M', 'kbn-connector-specs  (.salesforce)', [
      'src/platform/packages/shared/kbn-connector-specs/src/specs/salesforce/salesforce.ts',
    ], 'CONN-001',
    'All .salesforce actions (query, get_record, list_records, search) are isTool: true. The existing query action returns raw SOQL results but does not expose nextRecordsUrl for pagination, making bulk incremental ingest via workflows impossible.',
    'Add soqlIngest action with isTool: false. Input: { soql?: string, nextRecordsUrl?: string }. Output: { records[], nextRecordsUrl?, done, totalSize }. On first call: execute SOQL query. On subsequent calls: fetch nextRecordsUrl. Enable watermark-based incremental sync via LastModifiedDate > :watermark in SOQL WHERE clause.',
    'A workflow using salesforce.soqlIngest with SOQL "SELECT Id, CaseNumber FROM Case WHERE LastModifiedDate > :watermark ORDER BY LastModifiedDate ASC LIMIT 200" pages through all matching records. nextRecordsUrl is returned when more records exist. done: true indicates last page.',
    [],
  ),
  gapCard(
    'CONN-005',
    '[Connector V2] Add Google Drive ingest-plane action: listFilesIngest — folder-scoped file listing with modifiedTime watermark',
    'New', 'S', 'kbn-connector-specs  (.google_drive)', [
      'src/platform/packages/shared/kbn-connector-specs/src/specs/google_drive/google_drive.ts',
    ], 'CONN-001',
    'The .google_drive connector has searchFiles and listFiles (both isTool: true) for agent use. No ingest-plane action exists for bulk incremental file metadata ingestion from configured folders.',
    'Add listFilesIngest action with isTool: false. Input: { folderId: string, modifiedSince?: string (ISO timestamp), pageToken?: string, pageSize?: number }. Output: { files[{ id, name, mimeType, modifiedTime, owners, webViewLink, parents }], nextPageToken?, hasMore }. Builds a Drive API query: "{folderId}" in parents and modifiedTime > "{modifiedSince}" and trashed=false.',
    'A workflow using gdrive.listFilesIngest with a folder ID and modifiedSince watermark returns only files modified after that timestamp. nextPageToken pagination fetches subsequent pages. Returns metadata only — no file content.',
    [],
  ),
  gapCard(
    'CONN-006',
    '[Connector V2] Add integration test helper for isTool: false ingest-plane actions',
    'New', 'S', 'kbn-connector-specs  (test infrastructure)', [
      'src/platform/packages/shared/kbn-connector-specs/src/testing/  (new directory)',
    ], 'CONN-001',
    'The connector spec test infrastructure focuses on isTool: true agent-facing actions. There is no test helper for verifying ingest-plane action patterns: pagination loop correctness, watermark advancement, shouldBackoff behavior, and nextPage/cursor/nextRecordsUrl field presence.',
    'Add a test utility assertIngestAction(connector, actionName, mockResponse, opts) that verifies: (1) isTool === false, (2) output contains pagination token field (nextPageToken/nextCursor/nextRecordsUrl/pageInfo.endCursor), (3) input accepts a cursor/pageToken param, (4) shouldBackoff field is present in output schema. Use in existing ingest action tests.',
    'Running assertIngestAction against runQueryTemplate, soqlIngest, listFilesIngest, getChannelHistory all pass. Running it against a non-ingest action (searchFiles, query) fails with descriptive messages.',
    [],
  ),
];

// ── AGENT BUILDER ─────────────────────────────────────────────────────────────
const agentGaps = [
  gapCard(
    'AGENT-001',
    '[Agent Builder] Define YAML package format for Fleet-installable agent definitions',
    'New', 'M', 'Agent Builder  + kbn-agent-builder-common', [
      'x-pack/platform/plugins/shared/agent_builder/ (or x-pack/packages/kbn-agent-builder-common/)',
      'src/platform/packages/shared/kbn-workflows/spec/examples/ (agent YAML examples)',
    ], 'FLEET-005',
    'stepInstallAgentAssets reads kibana/agent/*.yaml but there is no published schema or documentation for what that YAML must contain. Package authors have no contract for agent definitions. The AgentCreateRequest type from @kbn/agent-builder-common is a TypeScript type, not a human-authorable YAML spec.',
    'Define a versioned YAML schema for agent package assets. Minimum fields: version, name, description, systemPrompt, connectorBindings (list of REPLACE_WITH_* placeholder → connector type mappings), allowedTools (list of connector.actionName pairs to expose as tools), indexPatterns (list of index patterns the agent can query). Publish as JSON Schema. Add validation in stepInstallAgentAssets.',
    'A kibana/agent/my-agent.yaml file conforming to the published schema installs correctly via Fleet. A file with missing required fields fails install with a schema validation error that names the missing field. The schema is published in kbn-agent-builder-common.',
    [],
  ),
  gapCard(
    'AGENT-002',
    '[Agent Builder] Support index pattern scoping for Fleet-installed agents',
    'New', 'M', 'Agent Builder  (agent configuration)', [
      'x-pack/platform/plugins/shared/agent_builder/server/api/agent_builder_management_api.ts',
      'x-pack/platform/plugins/shared/agent_builder/ (agent configuration schema)',
    ], 'AGENT-001',
    'Agent Builder agents can invoke any Elasticsearch tool the connector supports. Fleet-installed agents for a specific integration (e.g., sdlc_intel) should be scoped to that integration\'s indices. No index pattern restriction mechanism exists in the agent configuration.',
    'Add an indexPatterns field to AgentCreateRequest (and the YAML schema). When set, the agent\'s Elasticsearch tool actions (search, ES|QL, etc.) are restricted to indices matching those patterns. Requests targeting other indices are rejected by the agent runtime with a clear error.',
    'An agent installed with indexPatterns: ["github-intel-*", "sdlc-*"] successfully queries github-intel-issues but returns an error when querying .kibana or logs-*.',
    [],
  ),
  gapCard(
    'AGENT-003',
    '[Agent Builder] Support tool allowlist for Fleet-installed agents — restrict which connector actions the agent can call',
    'New', 'M', 'Agent Builder  (tool filter)', [
      'x-pack/platform/plugins/shared/agent_builder/server/ (tool execution middleware)',
    ], 'AGENT-001',
    'When an agent is given access to a connector (e.g., .github), it can call any isTool: true action that connector exposes. Fleet-installed agents should be constrained to a specific set of actions defined at package install time, preventing agents from making unintended calls.',
    'Add an allowedTools field to AgentCreateRequest: list of "connector_type.action_name" pairs (e.g., ".github.search", ".github.getIssue"). At agent execution time, tool calls not in the allowlist are blocked and return an error. Fleet YAML can enumerate the specific tools the agent is permitted to use.',
    'An agent with allowedTools: [".github.search"] successfully calls github.search but returns "tool not permitted" when attempting github.createIssue. An agent with no allowedTools field has access to all isTool: true actions for its configured connectors (current behavior, backward compatible).',
    [],
  ),
];

// ── KNOWLEDGE ENTRY ───────────────────────────────────────────────────────────
const keGaps = [
  gapCard(
    'KE-001',
    '[AI Assistant] Expose programmatic API for knowledge entry create/update/delete on AI Assistant plugin setup',
    'New', 'L', 'Elastic AI Assistant  (plugin setup API)', [
      'x-pack/platform/plugins/shared/ai_assistant_management/  (or equivalent AI Assistant plugin)',
    ], '—',
    'The Elastic AI Assistant has a knowledge base but no published plugin setup API for programmatic CRUD. Fleet\'s stepInstallKnowledgeAssets (FLEET-006) needs to call a create/upsert method at package install time without going through the HTTP API.',
    'Expose an aiAssistantManagement setup contract: { management: { createKnowledgeEntry(params, spaceId): Promise<id>, updateKnowledgeEntry(id, params, spaceId): Promise<void>, deleteKnowledgeEntry(id, spaceId): Promise<void>, getKnowledgeEntry(id, spaceId): Promise<entry|null> } }. Pattern mirrors workflowsManagement and agentBuilderManagement plugin APIs.',
    'Fleet\'s stepInstallKnowledgeAssets successfully creates a knowledge entry by calling aiAssistantManagement.createKnowledgeEntry() without making an HTTP request. The entry appears in the AI Assistant knowledge base. Uninstalling the Fleet package deletes the entry via deleteKnowledgeEntry().',
    [],
  ),
  gapCard(
    'KE-002',
    '[AI Assistant] Define knowledge entry package format — markdown files in kibana/knowledge_entry/ with frontmatter metadata',
    'New', 'S', 'AI Assistant  + Fleet packaging spec', [
      'x-pack/platform/plugins/shared/ai_assistant_management/ (or docs)',
      'x-pack/platform/plugins/shared/fleet/  (package spec docs)',
    ], 'KE-001, FLEET-006',
    'No format is defined for knowledge entry files in Fleet packages. stepInstallKnowledgeAssets (FLEET-006) cannot parse files without a defined schema.',
    'Define the knowledge entry file format: markdown file with YAML frontmatter containing { title: string, description: string, tags: string[], scope: space | global }. The markdown body is the knowledge content indexed into the AI Assistant knowledge base. Publish the format as part of the Fleet package authoring spec.',
    'A kibana/knowledge_entry/data-model.md file with valid frontmatter installs correctly. The AI Assistant can retrieve and surface the content when asked questions covered by the entry. A file with invalid frontmatter fails install with a schema validation error.',
    [],
  ),
];

// ════════════════════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ════════════════════════════════════════════════════════════════════════════
const allGapRows = [
  // Fleet
  ['FLEET-001','Done','S','Done','[Fleet/EPM] KibanaAssetType.workflow + KibanaSavedObjectType.workflow'],
  ['FLEET-002','Done','M','Done','[Fleet/EPM] stepInstallWorkflowAssets — install workflow YAML from package'],
  ['FLEET-003','Done','S','Done','[Fleet/EPM] Delete workflow assets on package uninstall'],
  ['FLEET-004','Done','S','Done','[Fleet/EPM] Register workflowsManagement as optional Fleet plugin dep'],
  ['FLEET-005','Done','M','Done','[Fleet/EPM] KibanaAssetType.agent + stepInstallAgentAssets'],
  ['FLEET-006','P1','M','New','[Fleet/EPM] KibanaAssetType.knowledgeEntry + stepInstallKnowledgeEntries'],
  ['FLEET-007','P1','S','New','[Fleet UI] Display workflow/agent/knowledge-entry assets in package detail'],
  ['FLEET-008','P2','M','New','[Fleet/EPM] Validate connector ID manifest vars against existing connectors'],
  ['FLEET-009','P2','S','New','[Fleet/EPM] Surface workflow YAML validation errors in install response'],
  // Workflows
  ['WF-001','P1','M','New','[Workflows] workflow.checkpoint built-in step type'],
  ['WF-002','P1','M','New','[Workflows] data.extract built-in step type (regex/GROK)'],
  ['WF-003','P1','M','New','[Workflows] Promote workflow.executeAsync from tech_preview to GA'],
  ['WF-004','P2','S','New','[Workflows] Index package_name on workflow execution records'],
  ['WF-005','P3','L','New','[Workflows] concurrency.strategy: queue'],
  ['WF-006','P2','S','New','[Workflows] Formalize shouldBackoff rate-limit signal contract'],
  // Connectors
  ['CONN-001','P1','S','New','[Connector V2] Document and lint isTool: false ingest-plane contract'],
  ['CONN-002','Done','M','Done','[Connector V2] GitHub ingest-plane actions (runQueryTemplate, graphqlQuery, listQueryTemplates)'],
  ['CONN-003','Done','M','Done','[Connector V2] Slack ingest-plane actions (listUsers, getChannelHistory, getConversationReplies)'],
  ['CONN-004','Done','M','Done','[Connector V2] Salesforce soqlIngest ingest-plane action'],
  ['CONN-005','P1','S','New','[Connector V2] Google Drive listFilesIngest ingest-plane action'],
  ['CONN-006','P3','S','New','[Connector V2] Integration test helper for isTool: false actions'],
  // Agent Builder
  ['AGENT-001','P1','M','New','[Agent Builder] YAML package format spec for Fleet-installable agents'],
  ['AGENT-002','P2','M','New','[Agent Builder] Index pattern scoping for Fleet-installed agents'],
  ['AGENT-003','P2','M','New','[Agent Builder] Tool allowlist for Fleet-installed agents'],
  // Knowledge Entry
  ['KE-001','P1','L','New','[AI Assistant] Programmatic knowledge entry API on plugin setup'],
  ['KE-002','P1','S','New','[AI Assistant] Knowledge entry package format spec'],
];

const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 560, hanging: 280 } } } }] },
      { reference: 'sub-bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1000, hanging: 280 } } } }] },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 21, color: C.black } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 36, bold: true, font: 'Arial', color: C.navy }, paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, font: 'Arial', color: C.blue }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, font: 'Arial', color: C.teal }, paragraph: { spacing: { before: 180, after: 70 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.blue, space: 1 } },
        children: [
          new TextRun({ text: 'SDLC Intel Fleet Package  —  Platform Gaps & Requirements', bold: true, size: 18, font: 'Arial', color: C.navy }),
          new TextRun({ text: '   |   Generic Platform Capabilities Only', size: 18, font: 'Arial', color: C.gray4 }),
        ],
        spacing: { after: 80 },
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.gray3, space: 1 } },
        children: [
          new TextRun({ text: 'Elastic  •  Confidential  •  Page ', size: 16, font: 'Arial', color: C.gray4 }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial', color: C.gray4 }),
          new TextRun({ text: ' of ', size: 16, font: 'Arial', color: C.gray4 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: 'Arial', color: C.gray4 }),
        ],
        spacing: { before: 80 },
      })] }),
    },

    children: [
      // ── COVER ──────────────────────────────────────────────────────────────
      sp(8),
      new Paragraph({ children: [new TextRun({ text: 'Platform Gaps & Requirements', bold: true, size: 72, font: 'Arial', color: C.navy })], spacing: { before: 0, after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: 'For shipping the SDLC Intel integration as a Fleet package', size: 38, font: 'Arial', color: C.blue })], spacing: { before: 0, after: 80 } }),
      new Paragraph({ children: [new TextRun({ text: 'Generic Kibana platform capabilities only  —  no SDLC-specific content', size: 26, font: 'Arial', color: C.gray4, italics: true })], spacing: { before: 0, after: 400 } }),

      new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
        rows: [new TableRow({ children: [new TableCell({
          width: { size: CW, type: WidthType.DXA }, borders: bdrs(C.navy),
          shading: { fill: C.gray1, type: ShadingType.CLEAR },
          margins: { top: 180, bottom: 180, left: 240, right: 240 },
          children: [
            p('This document catalogues every generic platform capability required to install, manage, and operate the SDLC Intel Fleet integration package. Each entry maps directly to one GitHub issue or pull request. SDLC-specific content (workflows, agents, dashboards, index templates shipped inside the package) is out of scope — this document covers only what the Kibana platform itself must provide.', { size: 22 }),
          ],
        })] })],
      }),
      sp(2),
      new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [2400, 2400, 2400, 2880],
        rows: [new TableRow({ children: [
          cell([p('Version', { size: 17, bold: true, color: C.gray4 }), p('0.1.0  (sdlc-poc branch)', { size: 19 })], 2400),
          cell([p('Author', { size: 17, bold: true, color: C.gray4 }), p('Yuliia Naumenko  /  Elastic', { size: 19 })], 2400),
          cell([p('Date', { size: 17, bold: true, color: C.gray4 }), p('June 2026', { size: 19 })], 2400),
          cell([p('Total gaps', { size: 17, bold: true, color: C.gray4 }), p('26  (11 Done in sdlc-poc  /  15 New)', { size: 19 })], 2880),
        ] })],
      }),
      newPage(),

      // ── TOC ───────────────────────────────────────────────────────────────
      h1('Contents'),
      new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-3' }),
      newPage(),

      // ── 1. SCOPE ──────────────────────────────────────────────────────────
      h1('1. Scope and Conventions'),
      h2('1.1 What is in scope'),
      p('This document covers generic Kibana platform capabilities. A capability is "generic" if it could benefit any Fleet integration package, not only sdlc_intel. Each gap describes what the platform must provide so that package authors can ship workflows, agents, and knowledge entries without modifying shared platform code themselves.'),
      sp(1),
      p('Components in scope:'),
      bullet('Fleet / EPM — asset type registration, install steps, uninstall, UI display, manifest var validation'),
      bullet('Kibana Workflows (kbn-workflows) — built-in step types, concurrency model, execution querying'),
      bullet('Connector V2 (kbn-connector-specs) — isTool contract, ingest-plane actions for GitHub / Slack / Salesforce / Google Drive'),
      bullet('Agent Builder — Fleet-installable agent YAML format, index pattern scoping, tool allowlist'),
      bullet('AI Assistant Knowledge — programmatic create/delete API, Fleet package format'),
      sp(1),
      h2('1.2 What is out of scope'),
      bullet('SDLC-specific content: the 29 workflow YAMLs, 6 agent YAMLs, 25 index templates, 7 dashboards — these live inside the Fleet package, not the platform.'),
      bullet('Infrastructure: Elasticsearch cluster sizing, ILM policy values, Kibana memory tuning.'),
      bullet('Security review of individual connector authentication flows.'),
      sp(1),
      h2('1.3 Gap card format'),
      p('Each gap in sections 3–7 follows this structure:'),
      sp(1),
      new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [1800, 8280],
        rows: [
          ...[
            ['ID', 'COMPONENT-NNN  e.g. FLEET-001, WF-002, CONN-005'],
            ['Priority', 'P0 = blocker (nothing works without it)  •  P1 = required for GA  •  P2 = important but workaroundable  •  P3 = nice to have  •  Done = already implemented in sdlc-poc branch, pending productionization'],
            ['Effort', 'S = < 1 day  •  M = 1–3 days  •  L = 3–7 days  •  XL = > 1 week'],
            ['Area', 'Plugin or package the change belongs to'],
            ['Deps', 'Gap IDs that must be completed first'],
            ['Current', 'What the platform does today'],
            ['Required', 'What the platform needs to do'],
            ['Accepts when', 'Testable acceptance criteria for the PR'],
            ['Files', 'File paths that will be created or modified'],
          ].map(([k, v]) => new TableRow({ children: [
            cell([p(k, { size: 18, bold: true, color: C.navy })], 1800, { fill: C.gray1 }),
            cell([p(v, { size: 18 })], 8280),
          ] })),
        ],
      }),
      sp(1),
      h2('1.4 Priority definitions'),
      new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [900, 9180],
        rows: [
          ...([
            ['P0', 'Blocker. Without this, the Fleet package cannot install at all. No workaround exists.'],
            ['P1', 'Required for GA release of sdlc_intel package. Must be merged before the integration ships.'],
            ['P2', 'Important for a complete experience. Can ship with a workaround but should be resolved in the same release cycle.'],
            ['P3', 'Quality-of-life improvement. Can be deferred to a follow-up release.'],
            ['Done', 'Already implemented in the sdlc-poc branch. Needs code review, tests, and merge to platform main. No new design work required.'],
          ].map(([prio, desc]) => {
            const pc = PRIO_COLORS[prio] || {};
            return new TableRow({ children: [
              cell([p(prio, { size: 18, bold: true, color: pc.text || C.black })], 900, { fill: pc.bg }),
              cell([p(desc, { size: 18 })], 9180),
            ] });
          })),
        ],
      }),
      newPage(),

      // ── 2. MASTER SUMMARY ─────────────────────────────────────────────────
      h1('2. Master Gap Summary'),
      p('All 26 gaps across five components. "Done" items exist in the sdlc-poc branch and require review + merge. "New" items require implementation.'),
      sp(1),
      summaryTable(allGapRows),
      newPage(),

      // ── 3. FLEET ──────────────────────────────────────────────────────────
      h1('3. Fleet / EPM'),
      p('Fleet\'s Extensible Package Manager (EPM) is responsible for installing, upgrading, and removing integration packages. The gaps in this section enable Fleet to manage three new Kibana asset types: workflow, agent, and knowledge_entry.'),
      sp(1),
      p('The generic extension pattern used for all three types:'),
      bullet('Add X = "x" to KibanaAssetType and KibanaSavedObjectType enums in epm.ts.'),
      bullet('Add a CREATE_X_ASSETS state to the install state machine (_state_machine_package_install.ts).'),
      bullet('Implement stepInstallXAssets: traverse kibana/x/ entries in the package zip, substitute REPLACE_WITH_* placeholders from policy vars, upsert via the relevant plugin API (workflowsManagement / agentBuilderManagement / aiAssistantManagement). Graceful skip when plugin unavailable.'),
      bullet('Handle deletion in remove.ts: separate X-typed asset refs, call plugin delete API.'),
      bullet('Register the plugin as an optional dep in kibana.jsonc and plugin.ts.'),
      bullet('Add display label to AssetTitleMap in Fleet UI constants.'),
      sp(1),
      sectionBand('FLEET-001 through FLEET-009', C.navy),
      sp(1),
      ...fleetGaps.flatMap(g => [g, sp(1)]),
      newPage(),

      // ── 4. WORKFLOWS ──────────────────────────────────────────────────────
      h1('4. Kibana Workflows  (kbn-workflows)'),
      p('The kbn-workflows package defines the YAML spec for Kibana Workflow automations. The gaps here add new built-in step types needed by ingest workflows, stabilize async execution, and improve operational observability.'),
      sp(1),
      sectionBand('WF-001 through WF-006', C.teal),
      sp(1),
      ...wfGaps.flatMap(g => [g, sp(1)]),
      newPage(),

      // ── 5. CONNECTOR V2 ───────────────────────────────────────────────────
      h1('5. Connector V2  (kbn-connector-specs)'),
      p('Connector V2 exposes external service integrations to both AI agents (isTool: true) and workflow automation (isTool: false). The ingest plane — isTool: false actions with watermark and pagination support — is the foundation of the entire data pipeline. Several ingest-plane actions are already implemented in the sdlc-poc branch; the remaining gaps are a new Google Drive action, contract formalization, and test infrastructure.'),
      sp(1),
      sectionBand('CONN-001 through CONN-006', C.orange),
      sp(1),
      ...connGaps.flatMap(g => [g, sp(1)]),
      newPage(),

      // ── 6. AGENT BUILDER ──────────────────────────────────────────────────
      h1('6. Agent Builder'),
      p('Agent Builder allows users to create and configure AI agents in Kibana. The Fleet integration for agent assets (FLEET-005) is already implemented in sdlc-poc. The remaining gaps define the package format spec and add scoping/allowlisting controls needed for safely shipping pre-configured agents in a Fleet package.'),
      sp(1),
      sectionBand('AGENT-001 through AGENT-003', C.purple),
      sp(1),
      ...agentGaps.flatMap(g => [g, sp(1)]),
      newPage(),

      // ── 7. AI ASSISTANT KNOWLEDGE ─────────────────────────────────────────
      h1('7. AI Assistant  —  Knowledge Entries'),
      p('The Elastic AI Assistant has a knowledge base that can be populated with domain-specific content. Shipping knowledge entries as part of a Fleet package requires a programmatic plugin API and a defined file format. Both are new capabilities with no existing implementation.'),
      sp(1),
      sectionBand('KE-001 through KE-002', C.blue),
      sp(1),
      ...keGaps.flatMap(g => [g, sp(1)]),
      newPage(),

      // ── 8. DEPENDENCY MAP ─────────────────────────────────────────────────
      h1('8. Dependency Map'),
      p('Implement in this order to avoid blocked work. Each row must complete before its dependents can start.'),
      sp(1),
      new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [2000, 3200, 4880],
        rows: [
          new TableRow({ children: [hcell('Gap', 2000), hcell('Blocks', 3200), hcell('Notes', 4880)], tableHeader: true }),
          ...([
            ['FLEET-001 (Done)', 'FLEET-002, FLEET-003, FLEET-005, FLEET-007', 'Foundation. KibanaAssetType enum change unlocks all install steps.'],
            ['FLEET-004 (Done)', 'FLEET-002', 'Plugin wiring must land before install step can call workflowsManagement.'],
            ['FLEET-002 (Done)', 'FLEET-003, FLEET-009', 'Install step needed before uninstall cleanup and error surfacing.'],
            ['FLEET-005 (Done)', 'FLEET-007, AGENT-001', 'Agent install step needed before UI display and YAML format spec.'],
            ['FLEET-006 (New)', 'KE-001, KE-002, FLEET-007', 'Knowledge entry asset type needed before install step and UI.'],
            ['KE-001 (New)', 'FLEET-006', 'Plugin API needed before Fleet install step can call it.'],
            ['CONN-001 (New)', 'CONN-005, WF-006', 'isTool contract formalization should precede new ingest actions and backoff docs.'],
            ['AGENT-001 (New)', 'AGENT-002, AGENT-003', 'YAML format spec needed before scoping and allowlist can be defined.'],
            ['WF-001 (New)', '—', 'Independent. checkpoint step simplifies all ingest workflows.'],
            ['WF-002 (New)', '—', 'Independent. data.extract step needed by feedback-loop enrichment workflows.'],
            ['WF-003 (New)', '—', 'Independent. Stabilizes executeAsync for Tier 5 agentic flows.'],
          ].map(([gap, blocks, notes]) => new TableRow({ children: [
            cell([p(gap, { size: 18, bold: true, color: C.navy })], 2000),
            cell([p(blocks, { size: 18 })], 3200),
            cell([p(notes, { size: 18 })], 4880),
          ] }))),
        ],
      }),
      sp(1),
      h2('8.1 Suggested milestone grouping'),
      sp(1),
      new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [2000, 4000, 4080],
        rows: [
          new TableRow({ children: [hcell('Milestone', 2000), hcell('Gaps', 4000), hcell('Outcome', 4080)], tableHeader: true }),
          ...([
            ['M1 — Merge Done', 'FLEET-001, 002, 003, 004, 005\nCONN-002, 003, 004', 'All sdlc-poc work reviewed and merged to platform main. Workflows and agents install via Fleet.'],
            ['M2 — Knowledge', 'KE-001, KE-002\nFLEET-006\nFLEET-007 (all three types)', 'Knowledge entries install via Fleet. All three new asset types visible in Fleet UI.'],
            ['M3 — Contracts', 'CONN-001, CONN-005\nWF-006\nAGENT-001', 'isTool: false contract documented and linted. Google Drive ingest action. Agent YAML format spec.'],
            ['M4 — Workflow DX', 'WF-001, WF-002, WF-003, WF-004', 'checkpoint and data.extract steps. executeAsync GA. Package-name indexed on runs.'],
            ['M5 — Quality', 'FLEET-008, FLEET-009\nCONN-006\nAGENT-002, AGENT-003\nWF-005', 'Connector ID validation, YAML error surfacing, test helpers, agent scoping, queue concurrency.'],
          ].map(([m, gaps, outcome]) => new TableRow({ children: [
            cell([p(m, { size: 18, bold: true, color: C.navy })], 2000, { fill: C.gray1 }),
            cell([p(gaps, { size: 17 })], 4000),
            cell([p(outcome, { size: 18 })], 4080),
          ] }))),
        ],
      }),
      newPage(),

      // ── 9. TICKET TEMPLATE ────────────────────────────────────────────────
      h1('9. GitHub Issue Template'),
      p('Use this template when creating GitHub issues from each gap card. The gap ID becomes the issue label for cross-referencing.'),
      sp(1),
      new Table({
        width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
        rows: [new TableRow({ children: [new TableCell({
          width: { size: CW, type: WidthType.DXA },
          borders: bdrs(C.teal),
          shading: { fill: C.gray1, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 200, right: 200 },
          children: [
            p('**Title:** [COMPONENT-NNN] <gap title verbatim>', { size: 20 }),
            p('**Labels:** platform-gap, <component>, <priority>', { size: 20 }),
            p('**Milestone:** M1 / M2 / M3 / M4 / M5  (from section 8.1)', { size: 20 }),
            p('', { size: 20 }),
            p('## Problem', { size: 20, bold: true }),
            p('<Current field from gap card>', { size: 20 }),
            p('', { size: 20 }),
            p('## Solution', { size: 20, bold: true }),
            p('<Required field from gap card>', { size: 20 }),
            p('', { size: 20 }),
            p('## Acceptance Criteria', { size: 20, bold: true }),
            p('<Accepts when field from gap card>', { size: 20 }),
            p('', { size: 20 }),
            p('## Files', { size: 20, bold: true }),
            p('<Files field from gap card>', { size: 20 }),
            p('', { size: 20 }),
            p('## Dependencies', { size: 20, bold: true }),
            p('<Deps field from gap card — link to those issues>', { size: 20 }),
            p('', { size: 20 }),
            p('## Effort estimate', { size: 20, bold: true }),
            p('S < 1 day  /  M 1–3 days  /  L 3–7 days  /  XL > 1 week', { size: 20 }),
          ],
        })] })],
      }),
      sp(2),
      rule(),
      p([new TextRun({ text: 'Platform Gaps & Requirements  •  SDLC Intel Fleet Package  •  v0.1.0  •  June 2026  •  Elastic Security AI Dev Accelerators', font: 'Arial', size: 16, color: C.gray4, italics: true })], { align: AlignmentType.CENTER, before: 120 }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/Users/yuliianaumenko/Projects/kibana/sdlc-platform-gaps.docx', buf);
  console.log('Done: sdlc-platform-gaps.docx');
});
