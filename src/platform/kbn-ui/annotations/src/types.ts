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

export interface AnnotationSnapshot {
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  /** Base64 image payload; omitted from list responses (see `AnnotationsApi.getSnapshot`). */
  image?: string;
}

export interface AnnotationAuthor {
  username: string;
  displayName: string;
}

export interface AnnotationReply {
  id: string;
  author: AnnotationAuthor;
  text: string;
  createdAt: string;
}

export interface AnnotationRoute {
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

export interface Annotation {
  id: string;
  createdAt: string;
  updatedAt: string;
  author: AnnotationAuthor;
  text: string;
  resolved: boolean;
  replies: AnnotationReply[];
  route: AnnotationRoute;
  anchor: ElementAnchor;
  trail: TrailStep[];
  snapshot?: AnnotationSnapshot;
}

export type NewAnnotation = Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>;

export interface AnnotationPatch {
  resolved?: boolean;
  reply?: { author: AnnotationAuthor; text: string };
}

/** Comments as a JSON document; screenshots are left out so that any export can be imported again. */
export interface AnnotationsExport {
  version: 2;
  exportedAt: string;
  annotations: Annotation[];
}

export interface AnnotationsImportResult {
  imported: number;
  /** Comments this version of the layer cannot read. */
  skipped: number;
  /** Comments that could be read but not written; the host logs why. */
  failed: number;
}

/**
 * Persistence implemented by the host. Comments are resolved, never deleted;
 * an import adds or overwrites comments by id. Hosts reject writes beyond
 * their limits with an error whose message can be shown to the user.
 */
export interface AnnotationsApi {
  /** Every comment, oldest first, without screenshot images. */
  list(): Promise<Annotation[]>;
  getSnapshot(id: string): Promise<AnnotationSnapshot | undefined>;
  create(input: NewAnnotation): Promise<Annotation>;
  update(id: string, patch: AnnotationPatch): Promise<Annotation>;
  exportAll(): Promise<AnnotationsExport>;
  importAll(payload: AnnotationsExport): Promise<AnnotationsImportResult>;
}

export interface AnnotationsLocationService {
  /** Identity of the current page, see `AnnotationRoute.pageKey`. */
  getPageKey(): string;
  /** Current path relative to the host's origin and base path, see `AnnotationRoute.path`. */
  getPath(): string;
  subscribe(listener: () => void): () => void;
}

export interface AnnotationsUser {
  username: string;
  fullName?: string;
}

/** Everything the layer needs from its host. */
export interface AnnotationsHostServices {
  api: AnnotationsApi;
  location: AnnotationsLocationService;
  /** Navigates to a path as returned by `location.getPath()`, in-app when possible. */
  navigateToPath(path: string): Promise<void>;
  getCurrentUser(): Promise<AnnotationsUser>;
  /**
   * Renders what is on screen, the viewport at its size in CSS pixels, to a
   * canvas (e.g. with dom-to-image), leaving out elements marked with
   * `IGNORE_ATTR`; without it, comments have no screenshots.
   */
  captureViewport?(): Promise<HTMLCanvasElement>;
  /** Host UI that must never be annotated. */
  ignoreSelectors?: string[];
}
