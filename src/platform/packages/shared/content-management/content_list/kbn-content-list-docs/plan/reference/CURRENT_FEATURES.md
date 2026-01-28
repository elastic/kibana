# TableListView - Feature Inventory

## Document Purpose

This document provides a complete enumeration of all end-user functionality in the current `TableListView`. It serves as a checklist for feature parity in the new architecture.

**Related Documents:**
- **[CURRENT_USAGE.md](./CURRENT_USAGE.md)** - Usage patterns and pain points
- **[CURRENT_IMPL.md](./CURRENT_IMPL.md)** - Technical implementation details

---

## Table of Contents

1. [Overview](#overview)
2. [Finding & Discovering Content](#finding--discovering-content)
3. [Viewing Content](#viewing-content)
4. [Managing Individual Items](#managing-individual-items)
5. [Managing Multiple Items](#managing-multiple-items)
6. [Creating Content](#creating-content)
7. [Content Editor Features](#content-editor-features)
8. [Sharing & Collaboration](#sharing--collaboration)
9. [Navigation & Layout](#navigation--layout)
10. [Error Handling & Feedback](#error-handling--feedback)
11. [Accessibility](#accessibility)
12. [Personalization & Persistence](#personalization--persistence)
13. [Feature Summary](#feature-summary-by-category)

---

## Overview

The `TableListView` component provides 27 distinct user-facing features for managing user-generated content. This document catalogs **what users can do**, not how it's implemented technically.

### New Features in Refactoring

The proposed `ContentListProvider` architecture adds **3 new capabilities** based on [GitHub issue #159995](https://github.com/elastic/kibana/issues/159995):

1. **Initial Filter State** - Pre-select tags, users, or starred on load (Security team requirement)
2. **Preview Popovers** - Show content preview on hover/click without navigation (Visualisation team requirement)
3. **Analytics & Telemetry Hooks** - Track user interactions for usage metrics (Content Management requirement [#160016](https://github.com/elastic/kibana/issues/160016))

These features address specific team requirements while maintaining backward compatibility with existing functionality.

---

## Finding & Discovering Content

### 1. Search
- Search across all content by typing in the search box
- Real-time results as you type
- Search term validation with helpful error messages
- Clear indication of what you're searching for
- Persistent search across page navigation (stays in URL)

### 2. Filter by Tags
- Select one or more tags to narrow down results
- See item counts for each tag
- Include tags (show only items with these tags)
- Exclude tags (hide items with these tags)
- Filter by items with no tags
- Search within the tag list
- Tag cloud visualization showing popular tags

### 3. Filter by Creator
- Filter content by who created it
- See user avatars and names
- Select multiple creators at once
- Filter for content with no creator (legacy/managed items)
- Distinguish between user-created and Elastic-managed content

### 4. Filter by Starred
- Show only items you've marked as starred
- One-click toggle to see starred
- Special empty state when you have no starred items yet

### 5. Sort Content
- Sort by title (A-Z or Z-A)
- Sort by last updated (newest or oldest first)
- Sort by recently accessed (if you've visited items recently)
- Custom sort options specific to content type
- Sort choice is remembered for next visit
- Sort persists in the URL

---

## Viewing Content

### 6. Content Table
- View all your content in a responsive table
- See item title with icon and managed badge
- See when each item was last updated (e.g., "2 hours ago")
- Click item title to open it
- Hover to see full timestamp tooltips
- Keyboard navigation through the table
- Works well on mobile devices

### 7. Pagination
- Choose how many items to see per page (10, 20, 50, etc.)
- Navigate between pages
- See total number of items
- Page size preference is remembered
- Jump to specific pages

### 8. Loading & Empty States
- See a loading skeleton while content loads
- "Get started" prompt when you have no content yet
- "No results found" message when filters don't match anything
- Clear suggestions to adjust your search or filters
- "No starred items yet" prompt with encouragement to star items

---

## Managing Individual Items

### 9. View Item Details
- Click any item title to open it
- See item icon (visual indicator of content type)
- See if item is managed by Elastic (can't be edited)
- Quick access to item properties

### 10. Edit Items
- Edit button on each item row
- Opens item in editor (or modal editor)
- Inline editing without leaving the page (for some content types)
- Edit title, description, and tags in a modal
- Validation ensures you don't create duplicates
- Can't edit Elastic-managed content (edit button disabled)
- View-only mode for read-only access

### 11. Delete Items
- Delete button on each item row
- Confirmation dialog before deleting (prevents accidents)
- Clear warning about what will be deleted
- Can't delete Elastic-managed content (delete button disabled)
- See loading state while item is being deleted
- Error notification if deletion fails

### 12. Star Items
- Mark items as starred with a star icon
- Unstar items you no longer need quick access to
- Starred items sync across browser sessions
- Use starred filter to see only starred items

---

## Managing Multiple Items

### 13. Select Multiple Items
- Checkboxes on each row to select items
- "Select all" to select everything on current page
- See count of selected items
- Clear selection with one click

### 14. Bulk Delete
- Delete multiple selected items at once
- Bulk action toolbar appears when items are selected
- Confirmation dialog shows how many items will be deleted
- Can't bulk delete Elastic-managed items
- Progress indicator for bulk operations
- Success/error notifications after operation

---

## Creating Content

### 15. Create New Items
- Prominent "Create" button in page header
- Clear call-to-action when you have no content
- Launches creation workflow
- Import option (if available for content type)

---

## Content Editor Features

### 16. Inline Editing Modal
- Edit item metadata without leaving the list
- Edit title with duplicate detection
- Edit description
- Manage tags (add/remove)
- See activity history (who changed what and when)
- Validation errors shown inline
- Can't save until validation passes
- Cancel button to discard changes

---

## Sharing & Collaboration

### 17. Shareable URLs
- URL automatically includes your search terms
- URL includes active filters (tags, creators, starred)
- URL includes current sort order
- Share URL with teammates to show specific view
- Bookmark specific searches and filter combinations

### 18. Creator Attribution
- See who created each item
- User avatars for visual recognition
- Tooltips with creator names
- Managed content shows Elastic badge instead of user

---

## Navigation & Layout

### 19. Page Header
- Clear title describing the content type
- Description text explaining the page
- Action buttons prominently placed (Create, Import, etc.)
- Consistent with rest of Kibana interface

### 20. Additional Content Areas
- Custom content sections below the table
- Related lists (e.g., "Unsaved drafts")
- Callouts for announcements or warnings
- Flexible layout for specialized needs

---

## Error Handling & Feedback

### 21. Error Messages
- Clear error messages when loading fails
- Helpful suggestions when search syntax is wrong
- Validation errors when editing items
- Notifications when operations fail
- Option to retry failed operations

### 22. Loading Indicators
- Skeleton UI while loading initial data
- Spinner for background refreshes
- Progress indicators for bulk operations
- Button loading states during actions

### 23. Success Feedback
- Confirmation when items are saved
- Notification when items are deleted
- Visual feedback for starred toggle
- Updated timestamps after edits

---

## Accessibility

### 24. Keyboard Support
- Tab through all interactive elements
- Arrow keys to navigate table rows
- Enter to activate buttons and links
- Escape to close modals
- Focus management for screen readers

### 25. Screen Reader Support
- Descriptive labels for all controls
- Announcements when content changes
- Table structure properly labeled
- Status updates for async operations
- Meaningful alt text and ARIA labels

---

## Personalization & Persistence

### 26. Remembered Preferences
- Page size preference saved between visits
- Sort preference saved per content type
- Active filters persist in URL for sharing
- Recently accessed items tracked for sorting

### 27. Recently Accessed
- See items you've recently opened
- Sort by most recently accessed
- Quick access to your frequent items

---

## Feature Summary by Category

| Category | Feature Count |
|----------|---------------|
| Finding & Discovery | 5 |
| Viewing | 3 |
| Individual Item Management | 4 |
| Multiple Item Management | 2 |
| Content Creation | 1 |
| Content Editor | 1 |
| Sharing & Collaboration | 2 |
| Navigation & Layout | 2 |
| Error Handling & Feedback | 3 |
| Accessibility | 2 |
| Personalization | 2 |
| **Total** | **27** |

---

## Related Documents

- [CURRENT_USAGE.md](./CURRENT_USAGE.md) - Usage patterns and pain points
- [CURRENT_IMPL.md](./CURRENT_IMPL.md) - Technical implementation details
- [CURRENT_DEV_HISTORY.md](./CURRENT_DEV_HISTORY.md) - Bug fixes and enhancements history

