# Active state and location

## Overview

Active styling shows the user's current location in the solution. Primary and secondary menus work as one system: a parent item and its child can both appear active when the current page is listed in the secondary panel.

## Rules

- **Exactly one** primary item is active in the visible primary column at a time.
- When the current URL matches a **secondary item**, both that item and its **parent primary** item are active.
- **Deep links** to pages not explicitly listed in navigation still activate the **correct parent** (and secondary ancestor if applicable), so users retain context even on leaf pages.
- Hidden routes (not in the secondary menu) must still resolve to the nearest parent in the tree.

## Engineering contract

Consumers pass `activeItemId` matching the current route id. The `useNavigation` hook derives visual active ids for primary vs secondary highlighting. See [Kibana integration](../engineering/kibana-integration.md).

![Placeholder: primary and secondary active states](../assets/active-state-placeholder.png)

*Suggested asset: expanded nav with both parent primary item and a child secondary item highlighted, on a leaf page URL.*
