# @kbn/shared-ux-feedback-snippet

---
id: sharedUX/Components/FeedbackSnippet
slug: /shared-ux/components/feedback_snippet
title: Feedback Snippet
summary: A component to gather user feedback that initially renders as a panel and becomes a button after interaction.
tags: ['shared-ux', 'component']
date: 2025-09-11
---
 
# Feedback Snippet
A snippet to gather user feedback. It initially renders as a panel, and once interacted with, it becomes a persistent button. It manages its own state (panel vs. button) based on user interaction tracked in `localStorage`.

## Behavior
The component has two main states:
- **Panel:** On its first render for a user, the component displays as a full panel with the `promptViewMessage` and options to provide positive ("Yes") or negative ("No") feedback. A "Dismiss" (x) button is also available.
- **Button:** The component uses the provided `feedbackPanelLocalStorageKey` to track whether the user has interacted with it. If a value is present for that key, the component will render as a button instead.

## Feedback Panel Views
- **Prompt:** The panel shows a custom `promptViewMessage` to gather feedback from the user.
- **Positive:** The panel shows a thank you message and then automatically dismisses itself.
- **Negative:** The panel updates to show a custom `surveyUrl` call-to-action button. The panel remains visible until the user explicitly dismisses it or navigates to the survey (which opens in a new tab).
