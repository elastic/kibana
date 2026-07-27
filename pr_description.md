## Summary

Adds a **Pinned Conversations** section to the Agent Builder sidebar. Users can pin any conversation via drag-and-drop or the actions menu; the pinned state is persisted in Elasticsearch and survives page reloads.

**What's included:**

- **ES schema + API** — new optional `pinned: boolean` field on the conversation document, converters updated throughout, and a new internal route `POST /internal/agent_builder/conversations/{id}/_mark_pinned`.
- **Optimistic mutations** — `markAsPinned` / `markAsUnpinned` update the React Query `byId` and `byAgent` caches immediately, call the API, and roll back via `invalidateQueries` on error.
- **Drag-and-drop** — a PINNED droppable zone sits above CHATS in the sidebar. Dragging CHATS → PINNED pins; dragging PINNED → CHATS unpins. Drop-zone backgrounds animate on hover; each zone blocks drops from itself (`isDropDisabled`). Drag is disabled while a brand-new conversation is being created (streaming + `conversation.status === undefined`) to prevent the item from disappearing before it is server-persisted.
- **Context menu** — Pin / Unpin item added between "Mark as read" and "Delete", using the same mutations.
- **EBT events** — `pin_conversation` and `unpin_conversation` events fire for both drag-and-drop and menu actions.
- **Bug fix** — `removeSidebarConversationListRow` in the send-message mutation is now guarded by `!conversationPersisted`, so a conversation that the server has already created is never silently wiped from the sidebar cache when streaming subsequently fails.

> Visual changes are included — a PINNED section now appears above CHATS in the Agent Builder sidebar, with a dashed placeholder when no conversations are pinned.

---

### Checklist

- [ ] Any text added follows [EUI's writing guidelines](https://elastic.github.io/eui/#/guidelines/writing), uses sentence case text and includes [i18n support](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-i18n/README.md)
- [ ] [Documentation](https://www.elastic.co/guide/en/kibana/master/development-documentation.html) was added for features that require explanation or tutorials
- [ ] [Unit or functional tests](https://www.elastic.co/guide/en/kibana/master/development-tests.html) were updated or added to match the most common scenarios
- [ ] If a plugin configuration key changed, check if it needs to be allowlisted in the cloud and added to the [docker list](https://github.com/elastic/kibana/blob/main/src/dev/build/tasks/os_packages/docker_generator/resources/base/bin/kibana-docker)
- [ ] This was checked for breaking HTTP API changes, and any breaking changes have been approved by the breaking-change committee. The `release_note:breaking` label should be applied in these situations.
- [ ] [Flaky Test Runner](https://ci-stats.kibana.dev/trigger_flaky_test_runner/1) was used on any tests changed
- [ ] The PR description includes the appropriate Release Notes section, and the correct `release_note:*` label is applied per the [guidelines](https://www.elastic.co/guide/en/kibana/master/contributing.html#kibana-release-notes-process)
- [ ] Review the [backport guidelines](https://docs.google.com/document/d/1VyN5k91e5OVumlc0Gb9RPa3h1ewuPE705nRtioPiTvY/edit?usp=sharing) and apply applicable `backport:*` labels.

---

### Test plan

**Happy path**
- [ ] Pin a conversation via drag-and-drop (CHATS → PINNED) — appears in PINNED, disappears from CHATS
- [ ] Unpin via drag-and-drop (PINNED → CHATS) — returns to CHATS in the correct sort position
- [ ] Pin via context menu (⋮ → Pin) — item moves to PINNED, menu item switches to "Unpin"
- [ ] Unpin via context menu (⋮ → Unpin) — item returns to CHATS
- [ ] Reload page — pinned state is preserved
- [ ] Multiple conversations can be pinned simultaneously

**Drag-and-drop UX**
- [ ] While dragging from CHATS, the CHATS zone shows no drop indicator (`isDropDisabled`)
- [ ] While dragging from PINNED, the PINNED zone shows no drop indicator
- [ ] Hovering over a valid drop zone shows the `backgroundLightPrimary` highlight
- [ ] Hovering over an empty PINNED zone highlights the dashed placeholder
- [ ] Dropping a conversation back in its own zone is a no-op

**Creation-phase guard**
- [ ] While a new conversation is streaming (first round), the sidebar item cannot be dragged
- [ ] After the first round completes, drag is re-enabled for that conversation
- [ ] Existing conversations with an active follow-up message can still be dragged normally

**Stream-failure bug fix**
- [ ] A stream error after server persistence leaves the conversation row in the sidebar
- [ ] A stream failure before server persistence still removes the optimistic row

**EBT**
- [ ] `pin_conversation` event fires for both drag and menu pin
- [ ] `unpin_conversation` event fires for both drag and menu unpin

**Regressions**
- [ ] Conversation list still sorts correctly (streaming conversations first, then by `updated_at`)
- [ ] Mark as read / unread works from both CHATS and PINNED rows
- [ ] Rename and delete work from both CHATS and PINNED rows
- [ ] Conversation search modal still works
- [ ] Empty CHATS state (no conversations) renders the "New conversation" link correctly

---

### Identify risks

- **ES mapping change** — adding `pinned: boolean` is a backwards-compatible, additive field. Existing documents without the field are treated as `pinned: false` by the converters. No migration needed.
- **Optimistic update race** — if `updatePinnedStatus` fails (e.g. transient network error), `invalidateQueries` refetches from the server and corrects the cache. The rollback is visible to the user as a momentary flicker back to the original position.
- **Drag-and-drop cancel during creation** — the `conversation.status === undefined` guard disables drag only for new conversations during their first streaming round. Any edge case where an existing conversation somehow has no status would also disable drag, though this cannot occur in practice (conversations are only server-returned after at least one completed round).

---

### Release Notes

Adds a Pinned Conversations section to the Agent Builder sidebar. Conversations can be pinned or unpinned via drag-and-drop or the conversation actions menu; the pinned state is persisted to Elasticsearch and restored on reload.
