# Discover Principles for Context Awareness Profiles

Context awareness profiles let teams tailor Discover to the data being explored. These principles define what should stay consistent across profiles so Discover still feels like Discover.

## The main parts of Discover

1. **ES|QL editor:** where you write the query that defines your data.
2. **Visualization area:** where the data is summarized in a meaningful way (e.g. logs histogram, metrics grid, traces grid, generic histogram).
3. **Data table:** where you inspect the individual records the query returns.

## Principles

- **The ES|QL editor is always present.** Not all three areas need to be visible at once, but the ES|QL editor is always there, along with at least the visualization area or the data table. The size and focus of each area can change as the query context shifts.

- **The data table reflects the ES|QL query 1:1.** Users expect a direct, one-to-one relationship between the ES|QL query they're running and the records shown in the table. The table is the source of truth for "what did my query return."

- **The visualization area is guided by the ES|QL query.** The query drives what the vis area displays. Some displays visualize the data exactly, while others take the spirit of the query and add extra context. Unlike the data table, the vis area is not held to a strict 1:1 relationship with the query.

- **Interactions scope to where they live.** Controls and direct interactions within the visualization area may act locally on that area, or update the whole query when that makes sense. But anything that changes the main data table's results must be reflected in the ES|QL query, preserving the table's 1:1 relationship. That includes controls, clicked cells, selected histogram bars, etc.
