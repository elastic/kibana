/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** One way of locating an element; locators are tried in order until one matches exactly one visible element. */
export type AnchorLocator =
  /** Chain of `data-test-subj` values from an ancestor down to the element, e.g. `"ruleFlyout > saveButton"`. */
  | { type: 'testSubj'; path: string }
  | { type: 'id'; value: string }
  | { type: 'ariaLabel'; value: string }
  /** Tag name (or `[role="tooltip"]`, for a tooltip) plus the element's own short text. */
  | { type: 'text'; tag: string; value: string }
  /** Structural CSS path from the nearest stable ancestor, plus a content fingerprint as a confidence check. */
  | { type: 'cssPath'; selector: string; fingerprint: string };

/** Innermost element under the pointer within the anchored element (a bar in a chart); the pin follows it through reflows. */
export interface AnchorTarget {
  /** Child path from the anchored element down to the target. */
  path: string;
  fingerprint: string;
  /** Offsets of the pin inside the target's box, 0..1. */
  relativeX: number;
  relativeY: number;
}

export interface ElementAnchor {
  locators: AnchorLocator[];
  /** Offsets of the pin inside the element's box, 0..1; used when `target` is absent or cannot be found. */
  relativeX: number;
  relativeY: number;
  target?: AnchorTarget;
}

export interface CommentSnapshot {
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  /** Base64 image payload; omitted from list responses (see `CommentsApi.getSnapshot`). */
  image?: string;
}

/** A screenshot as taken and stored: always with its image, which only reads leave out. */
export interface NewSnapshot extends CommentSnapshot {
  image: string;
}

export interface CommentAuthor {
  username: string;
  displayName: string;
}

export interface CommentReply {
  id: string;
  author: CommentAuthor;
  text: string;
  createdAt: string;
}

export interface CommentRoute {
  /** Host-defined identity of the page the comment was made on (pathname plus hash route, say); the pin is only placed there. */
  pageKey: string;
  /** Path, search and hash at the moment of commenting, relative to the host's origin and base path; the guide starts by opening it. Starts with a single `/`. */
  path: string;
}

/** What the author did to an element: clicked it, or hovered it to reveal what was then commented on. */
export type TrailStepKind = 'click' | 'hover';

/** Something the author did on the page before commenting; the guide to the comment asks the reader to repeat it. */
export interface TrailStep {
  anchor: ElementAnchor;
  label: string;
  /** A click when absent (steps stored before hovers were recorded). */
  kind?: TrailStepKind;
}

export interface Comment {
  id: string;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
  text: string;
  resolved: boolean;
  replies: CommentReply[];
  route: CommentRoute;
  anchor: ElementAnchor;
  trail: TrailStep[];
  snapshot?: CommentSnapshot;
}

export type NewComment = Omit<Comment, 'id' | 'createdAt' | 'updatedAt' | 'snapshot'> & {
  snapshot?: NewSnapshot;
};

export interface CommentPatch {
  resolved?: boolean;
  reply?: { author: CommentAuthor; text: string };
}

/** Persistence implemented by the host. Comments are resolved, never deleted; writes beyond the host's limits fail with a message for the user. */
export interface CommentsApi {
  /** Every comment, oldest first, without screenshot images. */
  list(): Promise<Comment[]>;
  /** One comment, without its screenshot image; `undefined` when there is none by the id. */
  get(id: string): Promise<Comment | undefined>;
  getSnapshot(id: string): Promise<CommentSnapshot | undefined>;
  create(input: NewComment): Promise<Comment>;
  update(id: string, patch: CommentPatch): Promise<Comment>;
}

export interface CommentsLocationService {
  /** Identity of the current page, see `CommentRoute.pageKey`. */
  getPageKey(): string;
  /** Current path relative to the host's origin and base path, see `CommentRoute.path`. */
  getPath(): string;
  subscribe(listener: () => void): () => void;
}

export interface CommentsUser {
  username: string;
  fullName?: string;
}

/** Everything the layer needs from its host. */
export interface CommentsHostServices {
  api: CommentsApi;
  location: CommentsLocationService;
  /**
   * Navigates to a path as returned by `location.getPath()`, in-app when
   * possible (a guide survives a page load). The path comes from a stored
   * comment: the host must refuse one leaving its deployment (`//host/...`, a scheme).
   */
  navigateToPath(path: string): Promise<void>;
  getCurrentUser(): Promise<CommentsUser>;
  /** Renders the viewport, at its size in CSS pixels, to a canvas, leaving out elements marked with `IGNORE_ATTR`; without it, comments have no screenshots. */
  captureViewport?(): Promise<HTMLCanvasElement>;
  /** Formats a moment in time (ISO 8601) as `Intl.DateTimeFormat` would, in the host's locale: `@kbn/i18n-react`'s `formatDate`. */
  formatDate(iso: string, options: Intl.DateTimeFormatOptions): string;
  /** Host UI that must never be commented on. */
  ignoreSelectors?: string[];
}
