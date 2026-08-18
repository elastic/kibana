'use strict';
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat, ExternalHyperlink,
  PageBreak, TableOfContents,
} = require('/Users/yuliianaumenko/.nvm/versions/node/v20.20.2/lib/node_modules/docx');

// ── Palette ─────────────────────────────────────────────────────────────────
const C = {
  navy:    '1B3A6B',
  blue:    '2E6FBF',
  teal:    '0E7C7B',
  green:   '2D6A2D',
  purple:  '5B2D8E',
  orange:  'B85C00',
  red:     'A61C00',
  gray1:   'F5F7FA',  // lightest bg
  gray2:   'E8ECF2',  // table header bg
  gray3:   'D0D7E3',  // border
  gray4:   '6B7280',  // subdued text
  white:   'FFFFFF',
  black:   '111111',
  new_bg:  'EAF5EA',  // light green for ★ new items
  new_bdr: '2D6A2D',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = 1080; // 0.75 inch
const CONTENT_W = PAGE_W - 2 * MARGIN; // 10080

function border(color = C.gray3) {
  return { style: BorderStyle.SINGLE, size: 1, color };
}
function borders(color = C.gray3) {
  const b = border(color);
  return { top: b, bottom: b, left: b, right: b };
}
function cell(children, w, opts = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    borders: borders(opts.bdrColor || C.gray3),
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    verticalAlign: VerticalAlign.TOP,
    children,
  });
}
function hcell(text, w, opts = {}) {
  return cell([
    new Paragraph({
      children: [new TextRun({ text, bold: true, size: 18, color: opts.color || C.navy, font: 'Arial' })],
    }),
  ], w, { fill: opts.fill || C.gray2, ...opts });
}
function p(children, opts = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [new TextRun({ text: children, font: 'Arial', size: opts.size || 22, color: opts.color || C.black, bold: opts.bold, italics: opts.italic })],
    spacing: { before: opts.before ?? 80, after: opts.after ?? 80, line: opts.line || 276 },
    alignment: opts.align,
  });
}
function bullet(text, opts = {}) {
  return new Paragraph({
    numbering: { reference: opts.sub ? 'sub-bullets' : 'bullets', level: 0 },
    children: [new TextRun({ text, font: 'Arial', size: opts.size || 20, color: opts.color || C.black, bold: opts.bold })],
    spacing: { before: 40, after: 40 },
  });
}
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: 'Arial', bold: true, size: 36, color: C.navy })], spacing: { before: 360, after: 160 } });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: 'Arial', bold: true, size: 28, color: C.blue })], spacing: { before: 280, after: 120 } });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: 'Arial', bold: true, size: 24, color: C.teal })], spacing: { before: 200, after: 80 } });
}
function rule() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.blue, space: 1 } },
    spacing: { before: 120, after: 120 },
    children: [],
  });
}
function newPage() {
  return new Paragraph({ children: [new PageBreak()] });
}
function tag(text, color) {
  return new TextRun({ text: `  ${text}  `, bold: true, size: 16, color: C.white, highlight: undefined, font: 'Arial' });
}
function callout(lines, color = C.blue) {
  const bdr = border(color);
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        borders: { top: border(color), bottom: border(color), left: { style: BorderStyle.SINGLE, size: 12, color }, right: border(color) },
        shading: { fill: C.gray1, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 200, right: 140 },
        children: lines.map(l => p(l, { size: 20 })),
      }),
    ] })],
  });
}

// ── Two-col helper ────────────────────────────────────────────────────────────
function twoCol(rows, w1 = 3200) {
  const w2 = CONTENT_W - w1;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [w1, w2],
    rows: rows.map(([a, b]) => new TableRow({ children: [
      cell([p(a, { size: 20 })], w1),
      cell([p(b, { size: 20 })], w2),
    ] })),
  });
}

// ── Four-col status table ─────────────────────────────────────────────────────
function statusTable(rows) {
  const cols = [3600, 1800, 1800, 2880];
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({ children: [
        hcell('Item', cols[0]),
        hcell('Phase', cols[1]),
        hcell('Status', cols[2]),
        hcell('Notes', cols[3]),
      ], tableHeader: true }),
      ...rows.map(([item, phase, status, notes]) => new TableRow({ children: [
        cell([p(item, { size: 19 })], cols[0]),
        cell([p(phase, { size: 19, align: AlignmentType.CENTER })], cols[1]),
        cell([p(status, { size: 19, bold: status === '✓ Done', color: status === '✓ Done' ? C.green : status === '★ New' ? C.purple : C.orange })], cols[2], { fill: status === '✓ Done' ? C.new_bg : undefined }),
        cell([p(notes, { size: 19 })], cols[3]),
      ] })),
    ],
  });
}

// ── Section divider ───────────────────────────────────────────────────────────
function sectionBadge(text, color = C.navy) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: CONTENT_W, type: WidthType.DXA },
        borders: borders(color),
        shading: { fill: color, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 180, right: 180 },
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 22, color: C.white, font: 'Arial' })] })],
      }),
    ] })],
  });
}

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENT
// ════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 560, hanging: 280 } } } }],
      },
      {
        reference: 'sub-bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1000, hanging: 280 } } } }],
      },
      {
        reference: 'numbers',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 560, hanging: 280 } } } }],
      },
    ],
  },

  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22, color: C.black } },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: C.navy },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: C.blue },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: C.teal },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 },
      },
    ],
  },

  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.blue, space: 1 } },
          children: [
            new TextRun({ text: 'SDLC Intelligence Platform', bold: true, size: 18, font: 'Arial', color: C.navy }),
            new TextRun({ text: '   |   Implementation Architecture', size: 18, font: 'Arial', color: C.gray4 }),
          ],
          tabStops: [{ type: 'right', position: 9360 }],
          spacing: { after: 80 },
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.gray3, space: 1 } },
          children: [
            new TextRun({ text: 'Elastic  •  Confidential  •  ', size: 16, font: 'Arial', color: C.gray4 }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial', color: C.gray4 }),
          ],
          spacing: { before: 80 },
        })],
      }),
    },

    children: [

      // ── COVER PAGE ──────────────────────────────────────────────────────────
      p('', { before: 1200, after: 0 }),
      new Paragraph({
        children: [new TextRun({ text: 'SDLC Intelligence Platform', bold: true, size: 72, font: 'Arial', color: C.navy })],
        spacing: { before: 0, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Implementation Architecture', size: 40, font: 'Arial', color: C.blue })],
        spacing: { before: 0, after: 360 },
      }),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [CONTENT_W],
        rows: [new TableRow({ children: [new TableCell({
          width: { size: CONTENT_W, type: WidthType.DXA },
          borders: borders(C.blue),
          shading: { fill: C.gray1, type: ShadingType.CLEAR },
          margins: { top: 200, bottom: 200, left: 280, right: 280 },
          children: [
            p([new TextRun({ text: 'End-to-end technical specification for the read-only SDLC visibility platform built on Elastic Stack, Kibana Workflows, Connector V2, and Fleet packages. Covers data sources, ingest pipeline, Elasticsearch index design, Kibana surfaces, generic platform extensions, and agentic workflow layer.', font: 'Arial', size: 22, color: C.black })], { before: 0, after: 0 }),
          ],
        })] })],
      }),
      p('', { before: 240, after: 0 }),
      twoCol([
        ['Version', '0.1.0  (sdlc-poc branch)'],
        ['Author', 'Yuliia Naumenko  •  Elastic Security AI Dev Accelerators'],
        ['Date', 'June 2026'],
        ['Status', 'POC / Technical Preview'],
      ]),
      newPage(),

      // ── TABLE OF CONTENTS ───────────────────────────────────────────────────
      h1('Table of Contents'),
      new TableOfContents('Table of Contents', {
        hyperlink: true,
        headingStyleRange: '1-3',
      }),
      newPage(),

      // ══════════════════════════════════════════════════════════════════════
      // 1. EXECUTIVE SUMMARY
      // ══════════════════════════════════════════════════════════════════════
      h1('1. Executive Summary'),
      p('The SDLC Intelligence Platform provides engineering leadership with a continuously updated, read-only analytical view of the software delivery lifecycle across GitHub, Slack, Salesforce, and Google Drive. It answers three questions at the team and program level:'),
      p(''),
      bullet('Planning coverage: Are epics staffed, scoped, and linked to design documents?'),
      bullet('Delivery alignment: Do pull requests close the tickets they reference? Are scope changes visible before merge?'),
      bullet('Customer feedback loop: Which Salesforce customer cases are linked to SDH issues and ultimately resolved by specific engineering epics?'),
      p(''),
      p('The platform is implemented as a self-contained Fleet integration package (sdlc_intel 0.1.0). All SDLC-specific logic resides inside this package. The only changes to shared Kibana platform code are generic, reusable extensions: support for workflow, agent, and knowledge-entry asset types in Fleet packages.'),
      p(''),
      callout([
        'NFR-003  Read-only: the platform never writes to GitHub, CI, Slack, Salesforce, or any source system.',
        'NFR-001  No individual scoring: all metrics are aggregated at team level or higher.',
        'NFR-004  LLM processing via enterprise AI gateway with Zero Data Retention agreements.',
        'NFR-005  12-month rolling data retention enforced by ILM policy.',
        'NFR-006  Role-gated access via Kibana Spaces.',
      ], C.navy),

      newPage(),

      // ══════════════════════════════════════════════════════════════════════
      // 2. ARCHITECTURE OVERVIEW
      // ══════════════════════════════════════════════════════════════════════
      h1('2. Architecture Overview'),
      p('The architecture has five horizontal layers, each building on the previous:'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [1800, 8280],
        rows: [
          new TableRow({ children: [
            hcell('Layer', 1800, { fill: C.navy, color: C.white }),
            hcell('Responsibility', 8280, { fill: C.navy, color: C.white }),
          ], tableHeader: true }),
          ...([
            ['Sources', 'GitHub (GraphQL v4), Slack (Web API), Salesforce (REST/SOQL), Google Drive (REST v3). All accessed read-only via Kibana Connector V2.'],
            ['Connector V2\nIngest Plane', 'Connector actions with isTool: false provide paginated, watermark-aware ingest primitives. These are workflow-facing only (not exposed to AI agents directly). GitHub adds runQueryTemplate (11 GraphQL templates); Slack adds listUsers/getChannelHistory/getConversationReplies; Salesforce adds soqlIngest; Google Drive adds listFilesIngest.'],
            ['Workflows (29)', 'Five tiers of YAML workflows execute on schedules, maintain checkpoint state in Elasticsearch sync-state indices, and write raw/enriched documents. All workflows are disabled by default, use concurrency: drop/max:1, and have connector IDs substituted at Fleet install time.'],
            ['Elasticsearch\n(25 indices)', 'Raw indices per source, derived SDLC indices, and cross-source relationship index. ILM policy enforces 365-day rolling retention with 30-day warm phase. Five ES|QL views provide pre-joined analytical projections.'],
            ['Kibana Surfaces', 'Seven dashboards with 18 Lens panels. Six Agent Builder agents scoped to SDLC indices. AI Assistant knowledge entries describing the data model and ES|QL query patterns. All installed automatically by Fleet.'],
          ].map(([l, r]) => new TableRow({ children: [
            cell([p(l, { size: 20, bold: true, color: C.navy })], 1800, { fill: C.gray1 }),
            cell([p(r, { size: 20 })], 8280),
          ] }))),
        ],
      }),
      p(''),
      h2('2.1 Generic Fleet Extension Pattern'),
      p('The only changes to shared Kibana platform code follow a single repeatable pattern:'),
      p(''),
      callout([
        '1. Add KibanaAssetType.X to Fleet\'s epm.ts enum.',
        '2. Add stepInstallXAssets to the Fleet state machine (reads kibana/X/*.yaml from package zip, upserts via optional plugin API, graceful skip if plugin unavailable).',
        '3. Add REPLACE_WITH_* placeholder substitution so connector IDs and org settings are injected at install time from Fleet policy variables.',
        '',
        'Applied to: workflow (implemented)  •  agent (new)  •  knowledgeEntry (new)',
        'Any Fleet package can use these extensions — not just sdlc_intel.',
      ], C.teal),

      newPage(),

      // ══════════════════════════════════════════════════════════════════════
      // 3. DATA SOURCES
      // ══════════════════════════════════════════════════════════════════════
      h1('3. Data Sources'),

      h2('3.1 GitHub'),
      p('Scope: the elastic GitHub organization via GraphQL API v4. The platform uses 11 named query templates (orgCatalog.* and activity.*) that cover org-wide catalog and incremental activity search without per-repository API calls.'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 3200, 4480],
        rows: [
          new TableRow({ children: [hcell('Template ID', 2400), hcell('Data', 3200), hcell('Notes', 4480)], tableHeader: true }),
          ...([
            ['orgCatalog.repos', 'Repository metadata', 'id, name, isPrivate, isArchived, topics, language, pushedAt'],
            ['orgCatalog.teams', 'Team definitions', 'slug, privacy, parentTeam'],
            ['orgCatalog.teamMembers', 'Team membership', 'by $teamSlug variable'],
            ['orgCatalog.members', 'Org members', 'login, role, company, location'],
            ['orgCatalog.projects', 'Projects v2', 'id, title, url, closed'],
            ['orgCatalog.projectViews', 'Project views', 'view name, filter field'],
            ['orgCatalog.projectItems', 'Project items', 'content (Issue/PR/Draft) + fieldValues'],
            ['activity.searchIssues', 'Org-wide issues', 'org:elastic updated:>watermark -is:pr'],
            ['activity.searchPRs', 'Org-wide PRs', 'inline reviews(first:10)'],
            ['graph.issueGraph', 'Issue subgraph', 'parent, subIssues(50), comments(50)'],
            ['graph.pullRequestGraph', 'PR subgraph', 'reviews(30), reviewThreads, closingIssuesReferences'],
          ].map(([id, data, notes]) => new TableRow({ children: [
            cell([p(id, { size: 18 })], 2400, { fill: C.gray1 }),
            cell([p(data, { size: 19 })], 3200),
            cell([p(notes, { size: 18, color: C.gray4 })], 4480),
          ] }))),
        ],
      }),
      p(''),
      p('SDH issues (Support Delivery Handoffs) live in repos matching the sdh-* pattern within the elastic org. They are ingested into a dedicated github-intel-sdh-issues index by a separate catalog workflow scoped to that repo pattern, keeping SDH lifecycle separate from product epics while sharing the same GraphQL infrastructure.'),

      h2('3.2 Slack'),
      p('Scope: all accessible channels in the configured Slack workspace. Three new ingest-plane actions (isTool: false) were added to the .slack2 connector:'),
      p(''),
      bullet('listUsers — paginated workspace user listing with bot/deleted filtering'),
      bullet('getChannelHistory — messages with oldest watermark for incremental sync, per-channel checkpoints'),
      bullet('getConversationReplies — thread replies keyed by channel + thread_ts'),
      p(''),
      p('OAuth scopes added: channels:history, groups:history, im:history. The channel history workflow uses nested while loops: outer loop pages over channels, inner loop pages message history per channel with per-channel sync-state checkpoints.'),

      h2('3.3 Salesforce'),
      p('Scope: Case objects (customer support tickets) and Account objects (customer organizations). The .salesforce connector is isTechnicalPreview and requires an enterprise license.'),
      p(''),
      p('A new soqlIngest action (isTool: false) was added to the connector providing:'),
      p(''),
      bullet('Watermark-based incremental sync on LastModifiedDate'),
      bullet('nextRecordsUrl pagination matching Salesforce\'s native REST pagination pattern'),
      bullet('Compact result schema: records[], nextRecordsUrl, done, totalSize'),
      p(''),
      p('Cross-link to GitHub SDH issues: Salesforce Cases typically contain a custom field (Engineering_Issue_URL__c by default, configurable via manifest var) holding the GitHub issue URL. The cross-link-feedback-loop workflow extracts this bidirectionally — reading both the Case custom field and GROK-extracting Salesforce case numbers from GitHub issue bodies — and writes edges to github-intel-relationships.'),

      h2('3.4 Google Drive'),
      p('Scope: specific shared Drive folders configured by the administrator via the gdrive_folder_ids manifest variable (multi-value, one per team folder). The .google_drive connector already existed with agent-facing actions; a new ingest-plane action was added:'),
      p(''),
      bullet('listFilesIngest (isTool: false) — lists files modified since a watermark, folder-scoped query, nextPageToken pagination, returns compact file metadata'),
      p(''),
      p('Two workflows consume this connector:'),
      bullet('gdrive-catalog-team-docs (Tier 1, daily) — catalogs all files in configured folders, upserts to gdrive-intel-documents'),
      bullet('github-extract-drive-links (Tier 3, hourly) — GROKs docs.google.com URLs from GitHub issue bodies, calls getFileMetadata, writes to gdrive-intel-documents and github-intel-relationships with issue_references_design_doc edges'),
      p(''),
      p('File content is never downloaded into Elasticsearch. The index holds metadata only (title, owner, mimeType, modifiedTime, webViewLink, parentFolderIds). The downloadFile action remains agent-facing (isTool: true) for on-demand retrieval.'),

      newPage(),

      // ══════════════════════════════════════════════════════════════════════
      // 4. CONNECTOR V2 INGEST PLANE
      // ══════════════════════════════════════════════════════════════════════
      h1('4. Connector V2 Ingest Plane'),
      p('Connector V2 distinguishes agent-facing actions from workflow-facing ingest actions via the isTool flag:'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [1600, 2200, 6280],
        rows: [
          new TableRow({ children: [hcell('Connector', 1600), hcell('Action', 2200), hcell('Description', 6280)], tableHeader: true }),
          ...([
            ['.github', 'runQueryTemplate *', 'Executes a named GraphQL template with variables + cursor. Returns data, pageInfo {hasNextPage, endCursor}, rateLimit, shouldBackoff signal.'],
            ['.github', 'graphqlQuery *', 'Executes an arbitrary read-only GraphQL query. Rejects mutations.'],
            ['.github', 'listQueryTemplates *', 'Lists all 11 available template IDs with descriptions.'],
            ['.slack2', 'listUsers *', 'Paginated users.list. Filters bots/deleted by default.'],
            ['.slack2', 'getChannelHistory *', 'conversations.history with oldest/latest/cursor.'],
            ['.slack2', 'getConversationReplies *', 'conversations.replies — thread replies for a given ts.'],
            ['.salesforce', 'soqlIngest *', 'Paginated SOQL via nextRecordsUrl. Watermark on LastModifiedDate.'],
            ['.google_drive', 'listFilesIngest *', 'Files modified since watermark in a folder. nextPageToken pagination.'],
          ].map(([conn, action, desc]) => new TableRow({ children: [
            cell([p(conn, { size: 19, bold: true, color: C.teal })], 1600, { fill: C.gray1 }),
            cell([p(action.replace(' *', ''), { size: 19 })], 2200),
            cell([p(desc, { size: 18 })], 6280),
          ] }))),
        ],
      }),
      p(''),
      p('* = isTool: false (workflow-only, not exposed to AI agents)', { size: 18, color: C.gray4, italic: true }),
      p(''),
      p('All pre-existing connector actions (e.g., GitHub search, Google Drive downloadFile) retain isTool: true and remain available to Agent Builder. The ingest plane additions are additive — they do not change existing action behavior.'),
      p(''),
      p('Rate limiting: the GitHub runQueryTemplate action returns shouldBackoff: true when rateLimit.remaining falls below a threshold. Workflows check this signal and insert a wait: 60s step before the next page fetch.'),

      newPage(),

      // ══════════════════════════════════════════════════════════════════════
      // 5. WORKFLOW TIERS
      // ══════════════════════════════════════════════════════════════════════
      h1('5. Workflow Tiers'),
      p('All 29 workflows share common structural properties:'),
      p(''),
      bullet('enabled: false — workflows are created disabled; administrators enable them after verifying connector configuration'),
      bullet('concurrency: { key: sdlc-*, strategy: drop, max: 1 } — prevents overlapping runs'),
      bullet('REPLACE_WITH_* placeholders substituted at Fleet install time from integration policy variables'),
      bullet('Checkpoint state in Elasticsearch sync-state indices (read at start, write on completion)'),
      p(''),
      callout([
        'Watermark pattern (Tier 2 activity workflows):',
        '  1. Read checkpoint → restore cursor + watermark.',
        '  2. Set runStartedAt = execution.startedAt.',
        '  3. Paginate with max-iterations cap.',
        '  4. clear_cursor_if_complete: clears cursor only when hasNextPage = false.',
        '  5. write_checkpoint always writes watermark: runStartedAt (unconditional).',
        '',
        'This ensures partial runs preserve the cursor for resumption, and the watermark only advances when a full page set completes.',
      ], C.teal),

      h2('5.1 Tier 1 — Catalog (9 workflows, daily)'),
      p('Catalog workflows establish the organizational graph. They run once per day and use cursor-only checkpoints (no watermark — they refetch full pages each run but skip unchanged documents via upsert).'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [3600, 6480],
        rows: [
          new TableRow({ children: [hcell('Workflow', 3600), hcell('Target index', 6480)], tableHeader: true }),
          ...([
            ['github-catalog-repos', 'github-intel-repos'],
            ['github-catalog-teams', 'github-intel-teams'],
            ['github-catalog-team-members', 'github-intel-people (team membership edges)'],
            ['github-catalog-org-members', 'github-intel-people (org member records)'],
            ['github-catalog-projects', 'github-intel-projects'],
            ['github-catalog-project-views', 'github-intel-project-views'],
            ['github-catalog-project-items', 'github-intel-project-items'],
            ['github-catalog-sdh-issues', 'github-intel-sdh-issues  (repo:sdh-* scoped)'],
            ['slack-catalog-users', 'slack-intel-people'],
            ['gdrive-catalog-team-docs ★', 'gdrive-intel-documents  (configured folder IDs)'],
          ].map(([wf, idx]) => new TableRow({ children: [
            cell([p(wf, { size: 19 })], 3600, { fill: wf.includes('★') ? C.new_bg : undefined }),
            cell([p(idx, { size: 19 })], 6480),
          ] }))),
        ],
      }),

      h2('5.2 Tier 2 — Activity (4 workflows, 30m–1h)'),
      p('Activity workflows ingest incremental changes using watermark + cursor checkpoints. The GitHub workflows use org-wide search (org:elastic updated:>watermark) avoiding per-repository API fan-out.'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [3600, 2400, 4080],
        rows: [
          new TableRow({ children: [hcell('Workflow', 3600), hcell('Schedule', 2400), hcell('Target index', 4080)], tableHeader: true }),
          ...([
            ['github-activity-issues', 'every 30m', 'github-intel-issues'],
            ['github-activity-pull-requests', 'every 30m', 'github-intel-pull-requests'],
            ['slack-channel-history', 'every 1h', 'slack-intel-messages'],
            ['salesforce-catalog-cases', 'every 1h', 'salesforce-intel-cases'],
          ].map(([wf, sched, idx]) => new TableRow({ children: [
            cell([p(wf, { size: 19 })], 3600),
            cell([p(sched, { size: 19 })], 2400),
            cell([p(idx, { size: 19 })], 4080),
          ] }))),
        ],
      }),

      h2('5.3 Tier 3 — Enrichment (9 workflows, hourly)'),
      p('Enrichment workflows read from raw indices, compute derived fields, and write to enriched indices and the relationship graph. They run hourly and are idempotent.'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [4200, 5880],
        rows: [
          new TableRow({ children: [hcell('Workflow', 4200), hcell('Purpose', 5880)], tableHeader: true }),
          ...([
            ['github-enrich-issues-graph', 'Fetches parent, subIssues, comments for each issue. Writes graph.issueGraph subgraph to issue document.'],
            ['github-enrich-pull-requests-graph', 'Fetches reviews, reviewThreads, closingIssuesReferences. Writes to pull-requests document.'],
            ['github-normalize-project-items', 'Normalizes Projects v2 fieldValues into typed fields (Epic, Team, Phase, Type, Priority).'],
            ['github-project-epic-phases', 'Computes epic phase from normalized project items. Writes to sdlc-epic-phases.'],
            ['github-build-team-dimension', 'Joins team + members + repos into sdlc-team-dimension for dashboard filtering.'],
            ['github-cross-link-entities', 'Extracts closes/fixes references from PR bodies. Writes edges to github-intel-relationships.'],
            ['github-build-release-calendar', 'Reads milestone dates from repos. Writes to sdlc-release-calendar.'],
            ['slack-thread-replies', 'Fetches replies for messages with reply_count > 0. Writes to slack-intel-messages with is_thread_reply: true.'],
            ['github-extract-drive-links ★', 'GROKs docs.google.com URLs from issue bodies. Calls getFileMetadata. Writes to gdrive-intel-documents + issue_references_design_doc edges.'],
          ].map(([wf, desc]) => new TableRow({ children: [
            cell([p(wf, { size: 18 })], 4200, { fill: wf.includes('★') ? C.new_bg : undefined }),
            cell([p(desc, { size: 18 })], 5880),
          ] }))),
        ],
      }),

      h2('5.4 Tier 4 — Feedback Loop (1 workflow, daily)'),
      p('The cross-link-feedback-loop workflow closes the Case → SDH → Epic chain. It runs daily after Tier 2 activity ingestion completes.'),
      p(''),
      bullet('Reads salesforce-intel-cases where linked_github_issue_number is null'),
      bullet('GROKs GitHub issue URL from Engineering_Issue_URL__c (field name configurable via manifest var)'),
      bullet('Reads github-intel-sdh-issues where linked_salesforce_case_number is null'),
      bullet('GROKs Salesforce case number from issue body/title'),
      bullet('Writes customer_case_links_sdh and sdh_links_product edges to github-intel-relationships'),
      p(''),
      p('Because links can originate from either side (some Cases have the GitHub URL, some SDH issues have the Case number in the body), the workflow processes both directions in the same run. An edge is written whenever either side has the reference.'),

      h2('5.5 Tier 5 — Agentic Workflows (6 agents, on-demand)'),
      p('Agentic workflows are Agent Builder agents shipped in the Fleet package under kibana/agent/. They are installed via the new KibanaAssetType.agent extension and are configured with connector bindings, tool filters, and system prompts at install time.'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [3200, 2400, 4480],
        rows: [
          new TableRow({ children: [hcell('Agent', 3200), hcell('Phase', 2400), hcell('Indices / data required', 4480)], tableHeader: true }),
          ...([
            ['sdlc-coverage-analysis', 'Planning', 'sdlc-epic-phases, github-intel-project-items, sdlc-team-dimension'],
            ['sdlc-ticket-decomposition', 'Planning (suggest-only)', 'github-intel-issues, gdrive-intel-documents'],
            ['sdlc-prd-readiness', 'Planning', 'github-intel-issues, gdrive-intel-documents, github-intel-relationships'],
            ['sdlc-scope-alignment', 'Development', 'github-intel-pull-requests, github-intel-issues, github-intel-relationships'],
            ['sdlc-review-assist', 'Development → Kibana cases', 'github-intel-pull-requests, sdlc-epic-phases'],
            ['sdlc-sdh-attribution', 'Feedback', 'salesforce-intel-cases, github-intel-sdh-issues, github-intel-relationships'],
          ].map(([agent, phase, data]) => new TableRow({ children: [
            cell([p(agent, { size: 19 })], 3200),
            cell([p(phase, { size: 19 })], 2400),
            cell([p(data, { size: 18, color: C.gray4 })], 4480),
          ] }))),
        ],
      }),
      p(''),
      p('Agents never write to source systems (NFR-003). sdlc-ticket-decomposition produces suggestions as output only; sdlc-review-assist writes to Kibana cases (internal), not GitHub.'),

      newPage(),

      // ══════════════════════════════════════════════════════════════════════
      // 6. ELASTICSEARCH LAYER
      // ══════════════════════════════════════════════════════════════════════
      h1('6. Elasticsearch Layer'),

      h2('6.1 Index Catalogue (25 templates)'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [3800, 1600, 4680],
        rows: [
          new TableRow({ children: [hcell('Index', 3800), hcell('Source', 1600), hcell('Key fields', 4680)], tableHeader: true }),
          ...([
            ['github-intel-repos', 'GitHub', 'entity.id, name, language, topics, pushedAt'],
            ['github-intel-teams', 'GitHub', 'team.slug, team.org, members_count'],
            ['github-intel-people', 'GitHub', 'login, role, team_slugs[], org'],
            ['github-intel-issues', 'GitHub', 'entity.{id,url,number}, github.{state,created_at,updated_at}, content.{title,body}, people.author, labels[]'],
            ['github-intel-pull-requests', 'GitHub', 'state, merged_at, reviews[], closing_issues[]'],
            ['github-intel-projects', 'GitHub', 'projectsV2 metadata'],
            ['github-intel-project-views', 'GitHub', 'view name, filter field, project_id'],
            ['github-intel-project-items', 'GitHub', 'content_type, fieldValues (Epic, Team, Phase, Type, Priority), linked_issue_id'],
            ['github-intel-comments', 'GitHub', 'issue_id, author, body, created_at'],
            ['github-intel-reviews', 'GitHub', 'pr_id, reviewer, state, submitted_at'],
            ['github-intel-relationships', 'Cross-source', 'source_id, target_id, relation (closes/parent_of/epic_contains/customer_case_links_sdh/sdh_links_product/issue_references_design_doc)'],
            ['github-intel-sdh-issues', 'GitHub', 'Same as issues; scoped to sdh-* repos'],
            ['github-intel-sync-state', 'Internal', 'sync.source, entity_type, org.login, cursor, watermark, last_run_at'],
            ['slack-intel-messages', 'Slack', 'message.{ts,text,thread_ts,user_id,reply_count,is_thread_reply}, channel.{id,name}'],
            ['slack-intel-people', 'Slack', 'user.{id,name,real_name,email,display_name}'],
            ['slack-intel-sync-state', 'Internal', 'channel.{id,name}, cursor, watermark'],
            ['salesforce-intel-cases', 'Salesforce', 'case.{id,number,subject,status,priority}, account.{id,name}, linked_github_issue_number'],
            ['salesforce-intel-sync-state', 'Internal', 'watermark, last_run_at'],
            ['gdrive-intel-documents ★', 'Google Drive', 'file.{id,name,mimeType,owner,modifiedTime,webViewLink}, folder_ids[]'],
            ['gdrive-intel-sync-state ★', 'Internal', 'folder_id, watermark, last_run_at'],
            ['sdlc-epic-phases', 'Derived', 'epic.{id,title,phase,team,roadmap,status}, gate.{design,dev,qa,ship}'],
            ['sdlc-team-dimension', 'Derived', 'team.{slug,members[]}, assigned_repos[], active_epics_count'],
            ['sdlc-release-calendar', 'Derived', 'milestone.{title,due_on,repo,state}'],
          ].map(([idx, src, fields]) => new TableRow({ children: [
            cell([p(idx, { size: 17 })], 3800, { fill: idx.includes('★') ? C.new_bg : undefined }),
            cell([p(src, { size: 17 })], 1600),
            cell([p(fields, { size: 16, color: C.gray4 })], 4680),
          ] }))),
        ],
      }),

      h2('6.2 ILM Policy'),
      p('A single ILM policy (sdlc_intel_retention) is applied to all indices via index template settings:'),
      p(''),
      bullet('Hot phase: 0–30 days — full indexing, primary + 1 replica'),
      bullet('Warm phase: 30–365 days — forcemerge to 1 segment, read-only'),
      bullet('Delete phase: after 365 days — index deleted'),
      p(''),
      p('The 12-month rolling window satisfies NFR-005 without manual intervention.'),

      h2('6.3 ES|QL Views (5)'),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [3600, 6480],
        rows: [
          new TableRow({ children: [hcell('View', 3600), hcell('Purpose', 6480)], tableHeader: true }),
          ...([
            ['sdlc_epic_tickets_by_repo', 'Joins sdlc-epic-phases with github-intel-issues. Counts tickets per epic per repo.'],
            ['sdlc_project_items_enriched', 'Joins github-intel-project-items with normalized fieldValues. Pre-filters closed/draft items.'],
            ['sdlc_github_raw_summary', 'High-level counts: issues open/closed, PRs merged, by team and date range.'],
            ['sdlc_ingest_health', 'Reads all sync-state indices. Reports last_run_at, pages_fetched, rate_limit per workflow. Used by Ingest Health dashboard.'],
            ['sdlc_salesforce_feedback', 'Joins salesforce-intel-cases with github-intel-sdh-issues via github-intel-relationships. Computes case-to-fix cycle time.'],
          ].map(([view, desc]) => new TableRow({ children: [
            cell([p(view, { size: 18 })], 3600, { fill: C.gray1 }),
            cell([p(desc, { size: 18 })], 6480),
          ] }))),
        ],
      }),

      newPage(),

      // ══════════════════════════════════════════════════════════════════════
      // 7. KIBANA SURFACES
      // ══════════════════════════════════════════════════════════════════════
      h1('7. Kibana Surfaces'),

      h2('7.1 Dashboards (7)'),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [3200, 6880],
        rows: [
          new TableRow({ children: [hcell('Dashboard', 3200), hcell('Primary use case', 6880)], tableHeader: true }),
          ...([
            ['Executive Roadmap', 'Epic status by roadmap area, phase distribution, team coverage'],
            ['Phase Pipeline', 'Epics flowing through gates: design → dev → QA → ship'],
            ['Team Dimension', 'Per-team member count, assigned repos, active epic load'],
            ['Raw Sync Overview', 'Document counts and freshness per source index'],
            ['Epic Gates', 'Gate pass rates, stale epics, epics missing PRD links'],
            ['Ingest Health', 'Last run time, pages fetched, rate limit headroom per workflow'],
            ['Salesforce Feedback', 'Open cases, % linked to SDH, % linked to epic, case-to-fix cycle time'],
          ].map(([name, purpose]) => new TableRow({ children: [
            cell([p(name, { size: 19, bold: true })], 3200, { fill: C.gray1 }),
            cell([p(purpose, { size: 19 })], 6880),
          ] }))),
        ],
      }),

      h2('7.2 Agent Builder Agents (6)'),
      p('Six pre-built agents are shipped in the Fleet package under kibana/agent/ and installed via the new KibanaAssetType.agent extension. Each agent has:'),
      p(''),
      bullet('A system prompt describing its analytical role and the available SDLC indices'),
      bullet('Tool bindings scoped to the relevant connector actions (isTool: true actions only)'),
      bullet('Index pattern restrictions preventing cross-tenant data access'),
      p(''),
      p('Coverage analysis and scope alignment are ready to deploy against current data. SDH attribution requires Salesforce Phase C1 to be operational. Ticket decomposition and PRD readiness gain full capability once Google Drive integration is active.'),

      h2('7.3 AI Assistant Knowledge Entries'),
      p('Markdown knowledge files are shipped in kibana/knowledge_entry/ and indexed into the Elastic AI Assistant knowledge base via the new KibanaAssetType.knowledgeEntry extension. Entries include:'),
      p(''),
      bullet('SDLC data model schema — index names, field names, and their semantics'),
      bullet('Epic phases taxonomy — how phases map to Projects v2 fieldValues'),
      bullet('Team dimension guide — how teams are resolved from GitHub data'),
      bullet('ES|QL query patterns — example queries for common SDLC analytical questions'),
      p(''),
      p('These entries allow the AI Assistant to answer SDLC questions without needing explicit schema context in every conversation.'),

      newPage(),

      // ══════════════════════════════════════════════════════════════════════
      // 8. FLEET PACKAGE MANIFEST
      // ══════════════════════════════════════════════════════════════════════
      h1('8. Fleet Package Configuration'),

      h2('8.1 Manifest Variables'),
      p('All connector IDs and configuration values are provided as integration policy variables at install time. Workflows and agents receive substituted values at the REPLACE_WITH_* placeholder positions.'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2800, 1600, 1400, 4280],
        rows: [
          new TableRow({ children: [hcell('Variable', 2800), hcell('Type', 1600), hcell('Required', 1400), hcell('Purpose', 4280)], tableHeader: true }),
          ...([
            ['github_connector_id', 'text', 'No', 'Connector ID for .github — substituted into all GitHub workflows'],
            ['slack_connector_id', 'text', 'No', 'Connector ID for .slack2 — substituted into Slack workflows'],
            ['salesforce_connector_id', 'text', 'No', 'Connector ID for .salesforce — substituted into Salesforce workflows'],
            ['gdrive_connector_id ★', 'text', 'No', 'Connector ID for .google_drive — substituted into Drive workflows'],
            ['org_login', 'text', 'No', 'GitHub org login (default: elastic)'],
            ['sdh_repo_pattern', 'text', 'No', 'Repo search qualifier for SDH issues (default: sdh-*)'],
            ['gdrive_folder_ids ★', 'text (multi)', 'No', 'Comma-separated Drive folder IDs to catalog for roadmap docs'],
            ['salesforce_case_github_field', 'text', 'No', 'Salesforce Case field holding GitHub issue URL (default: Engineering_Issue_URL__c)'],
          ].map(([name, type, req, purpose]) => new TableRow({ children: [
            cell([p(name, { size: 18 })], 2800, { fill: name.includes('★') ? C.new_bg : undefined }),
            cell([p(type, { size: 18 })], 1600),
            cell([p(req, { size: 18 })], 1400),
            cell([p(purpose, { size: 18 })], 4280),
          ] }))),
        ],
      }),

      h2('8.2 Asset Summary'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [3600, 2200, 4280],
        rows: [
          new TableRow({ children: [hcell('Asset type', 3600), hcell('Count', 2200), hcell('Location in zip', 4280)], tableHeader: true }),
          ...([
            ['Elasticsearch index templates', '25', 'elasticsearch/index_template/'],
            ['ILM policy', '1', 'elasticsearch/ilm_policy/'],
            ['ES|QL views', '5', 'elasticsearch/esql_view/'],
            ['Kibana workflows (YAML)', '29', 'kibana/workflow/'],
            ['Kibana agent definitions (YAML) ★', '6', 'kibana/agent/'],
            ['AI Assistant knowledge entries ★', '4', 'kibana/knowledge_entry/'],
            ['Kibana dashboards', '7', 'kibana/dashboard/'],
            ['Kibana Lens visualizations', '18', 'kibana/lens/'],
            ['Kibana saved searches', '8', 'kibana/search/'],
            ['Kibana data views (index patterns)', '7', 'kibana/index_pattern/'],
            ['Kibana tag', '1', 'kibana/tag/'],
          ].map(([type, count, path]) => new TableRow({ children: [
            cell([p(type, { size: 19 })], 3600, { fill: type.includes('★') ? C.new_bg : undefined }),
            cell([p(count, { size: 19, align: AlignmentType.CENTER })], 2200),
            cell([p(path, { size: 18, color: C.gray4 })], 4280),
          ] }))),
        ],
      }),

      newPage(),

      // ══════════════════════════════════════════════════════════════════════
      // 9. IMPLEMENTATION PHASES
      // ══════════════════════════════════════════════════════════════════════
      h1('9. Implementation Phases'),
      statusTable([
        ['KibanaAssetType.workflow + stepInstallWorkflowAssets', 'Phase A', '✓ Done', 'Generic Fleet extension. Any package can ship workflow assets.'],
        ['GitHub connector: runQueryTemplate + 11 GraphQL templates', 'Phase A', '✓ Done', 'Ingest plane. isTool: false.'],
        ['Slack connector: listUsers, getChannelHistory, getConversationReplies', 'Phase B', '✓ Done', 'Ingest plane.'],
        ['Tier 1 catalog workflows (8) + Tier 2 activity workflows (4)', 'Phase A/B', '✓ Done', 'Watermark + cursor pattern.'],
        ['Tier 3 enrichment workflows (8)', 'Phase A/B', '✓ Done', 'Issue/PR graph, epic phases, team dimension.'],
        ['Dashboards 1–4, Lens panels, saved searches', 'Phase B', '✓ Done', 'Roadmap, pipeline, team, sync.'],
        ['ILM policy (365d / 30d warm)', 'Phase B', '✓ Done', '12-month rolling retention.'],
        ['Salesforce connector: soqlIngest (isTool: false)', 'Phase C1', '★ New', 'SOQL pagination, LastModifiedDate watermark.'],
        ['salesforce-catalog-cases workflow', 'Phase C1', '★ New', 'Tier 2. Incremental Case ingest.'],
        ['github-catalog-sdh-issues workflow + index', 'Phase C1', '★ New', 'Tier 1. sdh-* repo scoped.'],
        ['cross-link-feedback-loop workflow', 'Phase C1', '★ New', 'Tier 4. Bidirectional Case↔SDH↔epic.'],
        ['Salesforce Feedback dashboard + ES|QL view', 'Phase C1', '★ New', 'Case-to-fix cycle time.'],
        ['Google Drive connector: listFilesIngest (isTool: false)', 'Phase C1', '★ New', 'Folder-scoped, modifiedTime watermark.'],
        ['gdrive-catalog-team-docs workflow', 'Phase C1', '★ New', 'Tier 1. Multi-folder catalog.'],
        ['github-extract-drive-links enrichment workflow', 'Phase C1', '★ New', 'Tier 3. GROK Drive URLs from issue bodies.'],
        ['KibanaAssetType.agent + stepInstallAgentAssets', 'Phase C2', '★ New', 'Generic Fleet extension.'],
        ['KibanaAssetType.knowledgeEntry + stepInstallKnowledgeEntries', 'Phase C2', '★ New', 'Generic Fleet extension.'],
        ['6 Agent Builder agents (kibana/agent/)', 'Phase C2', '★ New', 'Coverage, alignment, SDH attribution, etc.'],
        ['4 AI Assistant knowledge entries (kibana/knowledge_entry/)', 'Phase C2', '★ New', 'SDLC schema + ES|QL patterns.'],
        ['Ingest Health dashboard + Epic Gates dashboard', 'Phase C2', '★ New', 'Operational visibility.'],
      ]),

      newPage(),

      // ══════════════════════════════════════════════════════════════════════
      // 10. AGENTIC WORKFLOW CAPABILITIES
      // ══════════════════════════════════════════════════════════════════════
      h1('10. Agentic Workflow Capabilities'),
      p('The following table maps each Phase 4 agentic workflow to its readiness state based on current data availability:'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2400, 1800, 1600, 4280],
        rows: [
          new TableRow({ children: [hcell('Capability', 2400), hcell('Phase', 1800), hcell('Readiness', 1600), hcell('Dependency / Notes', 4280)], tableHeader: true }),
          ...([
            ['Coverage analysis', 'Planning', 'Ready now', 'sdlc-epic-phases, project-items, team-dimension all populated.'],
            ['Scope alignment', 'Development', 'Ready now', 'PR + issue + relationships data sufficient.'],
            ['SDH attribution', 'Feedback', 'After C1 deploy', 'Needs salesforce-intel-cases + sdh-issues populated.'],
            ['Ticket decomposition', 'Planning', 'Suggest-only', 'No GitHub write. Outputs decomposition to internal index.'],
            ['PRD readiness', 'Planning', 'After Drive active', 'Full capability once gdrive-intel-documents is populated.'],
            ['Review assist', 'Development', 'Kibana cases', 'Data ready. Output goes to Kibana cases, not GitHub.'],
            ['Rubric calibration', 'Feedback', 'Needs rubric', 'Delivery metrics exist. Rubric schema not yet defined.'],
            ['AI attribution', 'Development', 'No data', 'Requires GitHub Copilot usage API or commit analysis.'],
            ['Fix generation', 'Feedback', 'Out of scope', 'Writes code. Violates NFR-003 read-only constraint.'],
          ].map(([cap, phase, ready, notes]) => {
            const color = ready === 'Ready now' ? C.green : ready === 'Out of scope' ? C.red : C.orange;
            return new TableRow({ children: [
              cell([p(cap, { size: 19, bold: true })], 2400),
              cell([p(phase, { size: 19 })], 1800),
              cell([p(ready, { size: 18, color, bold: ready === 'Ready now' })], 1600),
              cell([p(notes, { size: 18 })], 4280),
            ] });
          })),
        ],
      }),

      newPage(),

      // ══════════════════════════════════════════════════════════════════════
      // 11. DATA FLOW DIAGRAM (text)
      // ══════════════════════════════════════════════════════════════════════
      h1('11. End-to-End Data Flow'),
      p('The following describes the complete data path from source system to analytical surface:'),
      p(''),
      h3('11.1 Raw Ingest Path'),
      bullet('Source systems (GitHub GraphQL, Slack Web API, Salesforce REST, Google Drive REST) are polled by Tier 1 and Tier 2 workflows.'),
      bullet('Connector V2 ingest-plane actions (isTool: false) handle authentication, pagination, rate limiting, and response normalization.'),
      bullet('Each workflow reads its checkpoint from a *-sync-state index at startup. If no checkpoint exists, an initialWatermark constant is used.'),
      bullet('Documents are upserted into raw indices (github-intel-*, slack-intel-*, salesforce-intel-*, gdrive-intel-*) using the source system\'s stable entity ID.'),
      bullet('On completion, the workflow writes a new checkpoint: watermark advances to runStartedAt; cursor is cleared only when all pages fetched.'),

      h3('11.2 Enrichment Path'),
      bullet('Tier 3 enrichment workflows read from raw indices, resolve relationships (graph queries, URL extraction), and compute derived fields.'),
      bullet('Derived documents are written to sdlc-epic-phases, sdlc-team-dimension, sdlc-release-calendar, and github-intel-relationships.'),
      bullet('ES|QL views join across indices at query time, providing pre-joined projections without materializing join tables.'),

      h3('11.3 Feedback Loop Path'),
      bullet('Tier 4 cross-link workflow reads salesforce-intel-cases and github-intel-sdh-issues looking for cases with no linked issue (and vice versa).'),
      bullet('It extracts GitHub issue URLs from Salesforce Case custom fields and Salesforce case numbers from GitHub issue bodies.'),
      bullet('Cross-source edges are written to github-intel-relationships with the relation type customer_case_links_sdh or sdh_links_product.'),
      bullet('The sdlc_salesforce_feedback ES|QL view LOOKUP JOINs across this relationship graph for dashboard queries.'),

      h3('11.4 Agentic Path'),
      bullet('Agent Builder agents are scoped to SDLC indices and relevant connector actions.'),
      bullet('Agents can read from all indices listed in their configuration but cannot write to source systems.'),
      bullet('sdlc-review-assist writes suggestions to Kibana cases via the Kibana Cases API (internal, not GitHub).'),
      bullet('sdlc-ticket-decomposition writes suggestions to an internal sdlc-decomposition-suggestions index.'),
      bullet('AI Assistant queries benefit from knowledge entries describing the SDLC schema, reducing prompt length and improving answer accuracy.'),

      newPage(),

      // ══════════════════════════════════════════════════════════════════════
      // 12. APPENDIX
      // ══════════════════════════════════════════════════════════════════════
      h1('12. Appendix'),

      h2('12.1 Connector Action Reference'),
      p('Complete list of new isTool: false actions added in this implementation:'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [1800, 2400, 2000, 3880],
        rows: [
          new TableRow({ children: [hcell('Connector', 1800), hcell('Action', 2400), hcell('Pagination', 2000), hcell('Watermark field', 3880)], tableHeader: true }),
          ...([
            ['.github', 'runQueryTemplate', 'pageInfo.endCursor', 'updated:>watermark in query string'],
            ['.github', 'graphqlQuery', 'None (raw)', 'Caller-managed'],
            ['.github', 'listQueryTemplates', 'None', '—'],
            ['.slack2', 'listUsers', 'nextCursor', '— (full refresh)'],
            ['.slack2', 'getChannelHistory', 'nextCursor', 'oldest parameter (Unix timestamp)'],
            ['.slack2', 'getConversationReplies', 'nextCursor', 'oldest parameter'],
            ['.salesforce', 'soqlIngest', 'nextRecordsUrl', 'LastModifiedDate > watermark in SOQL'],
            ['.google_drive', 'listFilesIngest', 'nextPageToken', 'modifiedTime > watermark in Drive query'],
          ].map(([conn, action, pag, wm]) => new TableRow({ children: [
            cell([p(conn, { size: 18, bold: true, color: C.teal })], 1800),
            cell([p(action, { size: 18 })], 2400),
            cell([p(pag, { size: 18 })], 2000),
            cell([p(wm, { size: 18 })], 3880),
          ] }))),
        ],
      }),

      h2('12.2 Glossary'),
      p(''),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [2200, 7880],
        rows: [
          ...([
            ['SDH', 'Support Delivery Handoff. An engineering escalation from Elastic support, tracked as a GitHub issue in repos matching the sdh-* pattern.'],
            ['isTool: true', 'Connector action flag indicating the action is exposed to AI agents in Agent Builder. The agent can call it in a conversation.'],
            ['isTool: false', 'Connector action flag indicating the action is available to Kibana Workflows only. Not exposed to AI agents directly.'],
            ['watermark', 'A timestamp stored in a sync-state index representing the most recent successful run start time. Used to scope incremental queries.'],
            ['cursor', 'A pagination token from the previous run stored in sync-state. Retained for partial runs; cleared on full completion.'],
            ['runStartedAt', 'The execution.startedAt value captured at workflow start. The watermark always advances to this value, not the last document timestamp.'],
            ['Fleet package', 'A ZIP archive installable via Fleet that contains Elasticsearch and Kibana assets. The sdlc_intel package is installed as a Fleet integration.'],
            ['KibanaAssetType', 'An enum in Fleet\'s epm.ts that controls which asset types Fleet can install from a package. workflow, agent, and knowledgeEntry were added generically.'],
            ['REPLACE_WITH_*', 'Placeholder string in workflow and agent YAML files. Substituted at Fleet install time by substituteWorkflowConnectorIds using values from the integration policy variables.'],
          ].map(([term, def]) => new TableRow({ children: [
            cell([p(term, { size: 19, bold: true, color: C.navy })], 2200, { fill: C.gray1 }),
            cell([p(def, { size: 19 })], 7880),
          ] }))),
        ],
      }),

      p(''),
      p(''),
      rule(),
      p([
        new TextRun({ text: 'SDLC Intelligence Platform — Implementation Architecture  •  v0.1.0  •  Elastic Security AI Dev Accelerators  •  June 2026', font: 'Arial', size: 16, color: C.gray4, italics: true }),
      ], { align: AlignmentType.CENTER, before: 120 }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/Users/yuliianaumenko/Projects/kibana/sdlc-intel-architecture.docx', buf);
  console.log('Done: sdlc-intel-architecture.docx');
});
