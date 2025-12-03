# Screenshot Guide for Extension Points

This guide helps you systematically capture screenshots for each extension point in Discover.

## Prerequisites

1. **Start Kibana in dev mode:**
   ```bash
   yarn start
   # or for serverless:
   yarn serverless-oblt  # for Observability
   yarn serverless-security  # for Security
   ```

2. **Access Discover:**
   - Navigate to `http://localhost:5601`
   - Go to **Discover** app
   - Login with `elastic` / `changeme` (default dev credentials)

3. **Load sample data** (if needed):
   - Go to **Stack Management** → **Sample Data**
   - Add sample data sets (e.g., "Sample web logs", "Sample flight data")

## Screenshot Checklist

### 1. `getRenderAppWrapper` - App wrapper
**What to capture:** The entire Discover app showing any custom wrappers, banners, or providers
- **How to find:** 
  - Open Discover in Security or Observability solution
  - Look for any custom banners, context providers, or wrappers around the app
- **File name:** `get_render_app_wrapper.png`
- **Tip:** Take a full-page screenshot showing the entire Discover interface

---

### 2. `getDefaultAppState` - Default app state
**What to capture:** Initial columns, row height, chart visibility settings
- **How to find:**
  - Open Discover with logs data view (Observability → Logs)
  - Note the default columns shown
  - Check if chart is visible/hidden by default
- **File name:** `get_default_app_state.png`
- **Tip:** Show the data grid with default columns and chart state

---

### 3. `getDefaultAdHocDataViews` - Default ad-hoc data views
**What to capture:** Data View picker showing preset entries like "All logs"
- **How to find:**
  - Click on the data view picker (top left)
  - Look for preset entries like "All logs", "All metrics", etc.
- **File name:** `get_default_ad_hoc_data_views.png`
- **Tip:** Capture the dropdown/picker showing the preset data views

---

### 4. `getModifiedVisAttributes` - Modify chart (Lens)
**What to capture:** Custom chart visualization (e.g., metrics-specific chart type)
- **How to find:**
  - Open Discover with metrics data
  - Check if the chart shows a domain-specific visualization type
- **File name:** `get_modified_vis_attributes.png`
- **Tip:** Show the chart area with the custom visualization

---

### 5. `getChartSectionConfiguration` - Chart section configuration
**What to capture:** Custom buttons or actions in the chart area
- **How to find:**
  - Look at the chart section in Discover
  - Check for custom buttons like "Open in new tab"
- **File name:** `get_chart_section_configuration.png`
- **Tip:** Focus on the chart area showing custom UI elements

---

### 6. `getCellRenderers` - Cell renderers
**What to capture:** Custom cell formatting (badges, colors, links) in the data grid
- **How to find:**
  - Open Discover with logs data
  - Look at cells in columns like `log.level` (should show colored badges)
  - Check for custom formatting in trace or log fields
- **File name:** `get_cell_renderers.png`
- **Tip:** Zoom in on a few rows showing the custom cell renderers

---

### 7. `getRowIndicatorProvider` - Row indicator
**What to capture:** Row highlighting (e.g., red border for error logs)
- **How to find:**
  - Open Discover with logs data
  - Look for rows with colored indicators (e.g., red for error level logs)
- **File name:** `get_row_indicator_provider.png`
- **Tip:** Show multiple rows with different indicator colors

---

### 8. `getRowAdditionalLeadingControls` - Row leading controls
**What to capture:** Extra buttons at the start of each row
- **How to find:**
  - Open Discover with logs data
  - Look for additional action buttons at the beginning of rows
- **File name:** `get_row_additional_leading_controls.png`
- **Tip:** Show a few rows with the leading control buttons visible

---

### 9. `getAdditionalCellActions` - Additional cell actions
**What to capture:** Extra actions in a cell's popover menu
- **How to find:**
  - Click on a cell in the data grid
  - Open the cell actions popover
  - Look for custom actions beyond the default ones
- **File name:** `get_additional_cell_actions.png`
- **Tip:** Show the popover menu with custom actions visible

---

### 10. `getPaginationConfig` - Pagination
**What to capture:** Pagination mode (infinite scroll, multi-page, or single page)
- **How to find:**
  - Open Discover with logs data
  - Scroll to the bottom to see pagination controls
  - Check if it's infinite scroll or page-based
- **File name:** `get_pagination_config.png`
- **Tip:** Show the pagination controls at the bottom of the data grid

---

### 11. `getDocViewer` - Doc viewer
**What to capture:** Custom flyout with additional tabs or modified title
- **How to find:**
  - Click on a document row to open the flyout
  - Look for custom tabs (e.g., "Stack trace", "Related events", "Analysis")
  - Check if the title is customized
- **File name:** `get_doc_viewer.png`
- **Tip:** Show the flyout with custom tabs visible

---

### 12. `getAppMenu` - App menu
**What to capture:** Custom top navigation actions
- **How to find:**
  - Look at the top navigation bar in Discover
  - Check for custom action buttons (up to 2 allowed)
- **File name:** `get_app_menu.png`
- **Tip:** Show the top nav with custom actions visible

---

### 13. `getColumnsConfiguration` - Columns configuration
**What to capture:** Custom column headers with icons or renamed labels
- **How to find:**
  - Open Discover with logs or traces data
  - Look at column headers for custom icons or renamed labels
- **File name:** `get_columns_configuration.png`
- **Tip:** Show the data grid header row with custom column configurations

---

### 14. `getRecommendedFields` - Recommended fields
**What to capture:** "Recommended" section in the Field List
- **How to find:**
  - Open the Field List panel (usually on the left)
  - Look for a "Recommended" section with highlighted fields
- **File name:** `get_recommended_fields.png`
- **Tip:** Show the field list panel with the Recommended section visible

---

### 15. `DISCOVER_CELL_ACTIONS_TRIGGER` - Cell actions integration
**What to capture:** Standard cell actions with Discover context
- **How to find:**
  - Click on any cell in the data grid
  - Show the cell actions menu (this demonstrates the trigger integration)
- **File name:** `discover_cell_actions_trigger.png`
- **Tip:** Show the cell actions popover to demonstrate the integration

---

## Quick Screenshot Workflow

1. **Start with Observability solution:**
   ```bash
   yarn serverless-oblt
   ```

2. **Navigate to Discover** → Load logs data

3. **Take screenshots in this order:**
   - Data view picker (ad-hoc data views)
   - Default columns/state
   - Cell renderers (log.level badges)
   - Row indicators (error highlighting)
   - Row leading controls
   - Pagination
   - Doc viewer (click a row)
   - Recommended fields (field list)
   - Columns configuration

4. **Switch to Security solution:**
   ```bash
   yarn serverless-security
   ```

5. **Capture:**
   - App wrapper (if visible)
   - App menu (top nav actions)

6. **For chart-related screenshots:**
   - Load metrics data
   - Capture chart modifications and configuration

## Screenshot Tips

- **Use browser zoom:** Set to 100% for consistent sizing
- **Crop carefully:** Focus on the relevant UI element
- **Remove sensitive data:** Blur any real data if needed
- **Consistent theme:** Use the same theme for all screenshots
- **Annotations:** Consider adding arrows/highlights for subtle features
- **File format:** Save as PNG for best quality

## After Taking Screenshots

1. Save each screenshot with the correct name in `docs/extension_points/`
2. Uncomment the screenshot line in `EXTENSION_POINTS_INVENTORY.md`
3. Verify all images display correctly in the markdown preview

