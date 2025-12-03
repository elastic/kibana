# Extension Points Screenshots

This folder contains screenshots for the Discover extension points inventory.

## Naming Convention

Screenshots should be named after the extension point method name, using snake_case:

- `get_render_app_wrapper.png`
- `get_default_app_state.png`
- `get_default_ad_hoc_data_views.png`
- `get_modified_vis_attributes.png`
- `get_chart_section_configuration.png`
- `get_cell_renderers.png`
- `get_row_indicator_provider.png`
- `get_row_additional_leading_controls.png`
- `get_additional_cell_actions.png`
- `get_pagination_config.png`
- `get_doc_viewer.png`
- `get_app_menu.png`
- `get_columns_configuration.png`
- `get_recommended_fields.png`
- `discover_cell_actions_trigger.png`

## Image Format

- **Format:** PNG (preferred) or JPG
- **Recommended size:** 1200-1600px width (for readability)
- **File size:** Try to keep under 500KB (optimize if needed)

## How to Add Screenshots

1. Take a screenshot of the extension point in action in Discover
2. Save it with the appropriate name (see naming convention above)
3. Place it in this folder: `docs/extension_points/`
4. Uncomment the screenshot line in `EXTENSION_POINTS_INVENTORY.md`:
   ```markdown
   <!-- ![Extension point example](./docs/extension_points/extension_point_name.png) -->
   ```
   Change to:
   ```markdown
   ![Extension point example](./docs/extension_points/extension_point_name.png)
   ```

## Tips for Good Screenshots

- **Focus on the feature:** Crop to show the relevant UI element clearly
- **Use annotations:** Consider adding arrows or highlights if the feature is subtle
- **Consistent styling:** Use the same browser/theme for all screenshots
- **Show context:** Include enough surrounding UI to understand where the feature appears
- **Remove sensitive data:** Blur or redact any sensitive information

## Tools for Screenshots

- **macOS:** `Cmd+Shift+4` (select area) or `Cmd+Shift+3` (full screen)
- **Windows:** `Win+Shift+S` (Snipping Tool)
- **Linux:** `Shift+PrintScreen` or use a tool like Flameshot
- **Browser extensions:** Many browsers have screenshot extensions
- **Annotation tools:** Use tools like Skitch, Annotate, or built-in image editors to add arrows/highlights

