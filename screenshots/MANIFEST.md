# XDR Correlation Rules - Screenshot Manifest

**Captured:** 2026-03-17
**Purpose:** Stakeholder presentations, documentation, PR reviews
**Resolution:** Professional quality (high resolution)

---

## Screenshots

### 1. Rule Type Selection
**Filename:** [01-rule-type-selection.png](./01-rule-type-selection.png)

**Description:** Rule creation wizard showing **Correlation** as a selectable rule type alongside Query, Machine Learning, Threshold, etc.

**Key Features Visible:**
- Correlation rule type tile with icon
- Clear labeling and description
- Positioned among other rule types

**Use In:**
- Stakeholder demos (shows feature is integrated into existing UX)
- User documentation (rule creation starting point)
- PR description

---

### 2. Correlation Form Fields
**Filename:** [02-correlation-form-fields.png](./02-correlation-form-fields.png)

**Description:** Correlation-specific configuration form with all correlation parameters

**Key Features Visible:**
- **Correlation Type** dropdown (Temporal, Temporal Ordered, Event Count, Value Count)
- **Group By** field(s) selector
- **Time Window** duration picker
- **Event Count Threshold** (if applicable to selected type)
- **Value Count** configuration (if value_count type selected)

**Use In:**
- Technical demos (shows configuration options)
- User documentation (form field reference)
- UX reviews

---

### 3. ES|QL Preview with Timespan
**Filename:** [03-correlation-esql-preview-timespan.png](./03-correlation-esql-preview-timespan.png)

**Description:** ES|QL query preview panel showing compiled correlation query with timespan highlighting

**Key Features Visible:**
- ES|QL query syntax (FROM, WHERE, STATS, etc.)
- Time window highlighted in query
- Group By fields visible in STATS clause
- Query preview updates dynamically as form changes

**Use In:**
- Technical demos (shows ES|QL query generation)
- Engineering reviews (validates query correctness)
- Performance discussions (query optimization)

---

### 4. Event Count Condition Configuration
**Filename:** [04-correlation-event-count-condition.png](./04-correlation-event-count-condition.png)

**Description:** Event count threshold configuration for event_count correlation type

**Key Features Visible:**
- Event count threshold input field
- Threshold validation
- Helper text explaining behavior
- Preview showing how threshold affects query

**Use In:**
- User documentation (event count correlation guide)
- Demos for threshold-based use cases (brute force, scanning)

---

## Screenshot Usage Guidelines

**For Stakeholder Presentations:**
- Use screenshots 1 & 2 to show feature integration and ease of use
- Use screenshot 3 to demonstrate technical sophistication (ES|QL)

**For User Documentation:**
- Use all 4 screenshots to illustrate step-by-step rule creation
- Add annotations/callouts to highlight key fields

**For PR Reviews:**
- Include all screenshots to demonstrate UI completeness
- Link to this manifest for context

---

## Missing Screenshots (For Production)

**Additional screenshots needed for full documentation:**

1. **Correlation Alert in Alerts Table**
   - Shows correlation alert with shell + building blocks in alert list
   - Demonstrates expanded view with grouped alerts

2. **Building Blocks Expansion**
   - Shows building block alerts linked to shell alert
   - Demonstrates entity enrichment fields

3. **Rule Details Page**
   - Shows correlation rule configuration in view mode
   - Demonstrates execution history and performance metrics

4. **Timeline View**
   - Shows correlation alert rendered in Security timeline
   - Demonstrates grouped alert visualization

5. **Error State**
   - Shows validation error (e.g., invalid field name)
   - Demonstrates error handling UX

**Capture Priority:**
- 🔴 Screenshots 1-2: CRITICAL for stakeholder demos
- 🟡 Screenshots 3-5: HIGH for user documentation
- 🟢 Additional screenshots: MEDIUM for comprehensive docs

---

## Screenshot Capture Instructions (For Future Updates)

**Setup:**
1. Start Kibana with correlationRulesEnabled flag
2. Set browser window to 1920x1080 resolution
3. Use clean Kibana instance (no dev tools, clean data)
4. Close unnecessary browser tabs/extensions

**Capture:**
1. Navigate to target page
2. Wait for page to fully load (no spinners)
3. Take screenshot (browser built-in or tool)
4. Crop if needed (remove browser chrome, OS elements)
5. Save with descriptive filename (e.g., `05_correlation_alert_expanded.png`)

**Quality Check:**
- ✅ Resolution ≥1280x720 (1920x1080 preferred)
- ✅ No dev tools visible
- ✅ Clear, readable text
- ✅ Key features visible (not scrolled off-screen)
- ✅ Professional appearance (clean UI, no placeholder data)

---

**Last Updated:** 2026-03-21
**Maintainer:** Patryk Kopycinski
