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
  /** Tag name plus the element's own short text. */
  | { type: 'text'; tag: string; value: string }
  /** Structural CSS path from the nearest stable ancestor, plus a content fingerprint as a confidence check. */
  | { type: 'cssPath'; selector: string; fingerprint: string };

/**
 * Innermost element under the pointer when it is a descendant of the anchored
 * element (a bar inside a chart, a cell's content). The pin follows it, so it
 * stays put when the layout reflows with the window size.
 */
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
  /**
   * Host-defined identity of the page the comment was made on, for example the
   * pathname plus the hash route, without anything that varies between visits
   * of the same page; the pin is only placed there.
   */
  pageKey: string;
  /**
   * Path, search and hash at the moment of commenting, relative to the host's
   * origin and base path so it stays valid across deployments; "Take me there"
   * starts by opening it. Always starts with a single `/`.
   */
  path: string;
}

/** A click the author made on the page before commenting; "Take me there" asks the reader to repeat it. */
export interface TrailStep {
  anchor: ElementAnchor;
  label: string;
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

export type NewComment = Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>;

export interface CommentPatch {
  resolved?: boolean;
  reply?: { author: CommentAuthor; text: string };
}

/**
 * Persistence implemented by the host. Comments are resolved, never deleted.
 * Hosts reject writes beyond their limits with an error whose message can be
 * shown to the user.
 */
export interface CommentsApi {
  /** Every comment, oldest first, without screenshot images. */
  list(): Promise<Comment[]>;
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
  /** Navigates to a path as returned by `location.getPath()`, in-app when possible. */
  navigateToPath(path: string): Promise<void>;
  getCurrentUser(): Promise<CommentsUser>;
  /**
   * Renders what is on screen, the viewport at its size in CSS pixels, to a
   * canvas (e.g. with dom-to-image), leaving out elements marked with
   * `IGNORE_ATTR` and the host's own `ignoreSelectors`; without it, comments
   * have no screenshots.
   */
  captureViewport?(): Promise<HTMLCanvasElement>;
  /** Host UI that must never be commented on, nor appear in screenshots. */
  ignoreSelectors?: string[];
}
