/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';

// =============================================================================
// Shared styles
// =============================================================================

/** Monospace font stack used by all JSX-tag components. */
const baseFontCss = css({
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace",
  fontSize: 13,
  lineHeight: 1.5,
});

/**
 * Plain-object equivalent of {@link baseFontCss} for EUI component props
 * that accept `style` but not `css` (e.g. `readModeProps`).
 */
export const BASE_FONT: CSSProperties = {
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace",
  fontSize: 13,
  lineHeight: 1.5,
};

const rowCss = css({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  minHeight: 28,
});

const childRowCss = css({ minHeight: 26 });

const childrenBlockCss = css({ paddingLeft: 16 });

const collapseButtonCss = css({ marginLeft: -24 });

const useThemeStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    bracket: css({ color: euiTheme.colors.textSubdued }),
    tag: css({ color: euiTheme.colors.primaryText, fontWeight: 600 }),
    propName: css({ color: euiTheme.colors.warningText }),
    brace: css({ color: euiTheme.colors.textSubdued }),
    comment: css({ color: euiTheme.colors.textSubdued, fontStyle: 'italic' }),
  };
};

// =============================================================================
// JsxTag
// =============================================================================

export interface JsxTagProps {
  /** Component name displayed inside the angle brackets. */
  name: string;
  /** Whether this is a closing tag (e.g. `</Foo>`). */
  closing?: boolean;
  /** Whether this is a self-closing tag (e.g. `<Foo />`). */
  selfClosing?: boolean;
  /** Indentation depth (each level = 16px). */
  indent?: number;
  /** When `true`, the opening tag line becomes a toggle that collapses
   *  the children into a self-closing `<Foo ... />` summary. */
  collapsible?: boolean;
  /** Controlled collapsed state — only used when `collapsible` is `true`. */
  collapsed?: boolean;
  /** Called when the user clicks the toggle — only used when `collapsible` is `true`. */
  onToggleCollapsed?: () => void;
  /** Inline prop controls rendered after the tag name. */
  children?: ReactNode;
}

/**
 * Renders a JSX-like tag with syntax coloring.
 *
 * Angle brackets are rendered in a muted color, the component name in a
 * distinct "tag" color, and any children (typically inline prop editors)
 * are rendered one-per-line, indented under the tag name.
 *
 * When `collapsible` is `true`, a disclosure chevron appears to the left
 * of the opening bracket. Clicking the tag line toggles between the full
 * expanded view and a collapsed `<Foo ... />` summary.
 */
export const JsxTag = ({
  name,
  closing = false,
  selfClosing = false,
  indent = 0,
  collapsible = false,
  collapsed = false,
  onToggleCollapsed,
  children,
}: JsxTagProps) => {
  const styles = useThemeStyles();
  const indentCss = css({ paddingLeft: indent * 16 });
  const hasChildren = React.Children.count(children) > 0;

  if (collapsible && collapsed) {
    return (
      <div css={[baseFontCss, rowCss, indentCss]}>
        <EuiButtonIcon
          iconType="arrowRight"
          size="xs"
          color="text"
          aria-label={`Expand ${name}`}
          onClick={onToggleCollapsed}
          css={collapseButtonCss}
        />
        <span css={styles.bracket}>{'<'}</span>
        <span css={styles.tag}>{name}</span>
        <span css={styles.bracket}>{' ... >'}</span>
      </div>
    );
  }

  if (!hasChildren) {
    return (
      <div css={[baseFontCss, rowCss, indentCss]}>
        <span css={styles.bracket}>{closing ? '</' : '<'}</span>
        <span css={styles.tag}>{name}</span>
        <span css={styles.bracket}>{selfClosing ? ' />' : '>'}</span>
      </div>
    );
  }

  return (
    <div css={[baseFontCss, indentCss]}>
      <div css={rowCss}>
        {collapsible && (
          <EuiButtonIcon
            iconType="arrowDown"
            size="xs"
            color="text"
            aria-label={`Collapse ${name}`}
            onClick={onToggleCollapsed}
            css={collapseButtonCss}
          />
        )}
        <span css={styles.bracket}>{'<'}</span>
        <span css={styles.tag}>{name}</span>
      </div>
      <div css={childrenBlockCss}>
        {React.Children.map(children, (child) => (
          <div css={childRowCss}>{child}</div>
        ))}
      </div>
      <div css={rowCss}>
        <span css={styles.bracket}>{selfClosing ? '/>' : '>'}</span>
      </div>
    </div>
  );
};

// =============================================================================
// JsxPropDisplay
// =============================================================================

export interface JsxPropDisplayProps {
  /** Prop name. */
  name: string;
  /** The control element (checkbox, input, etc.). */
  children: ReactNode;
}

const propDisplayCss = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
});

/**
 * Renders a prop name + value control in JSX-like syntax.
 *
 * The prop name is styled as an attribute, followed by `={` and the
 * inline control, then `}`.
 */
export const JsxPropDisplay = ({ name, children }: JsxPropDisplayProps) => {
  const styles = useThemeStyles();

  return (
    <span css={[baseFontCss, propDisplayCss]}>
      <span css={styles.propName}>{name}</span>
      <span css={styles.brace}>={'{'}</span>
      <span css={baseFontCss}>{children}</span>
      <span css={styles.brace}>{'}'}</span>
    </span>
  );
};

// =============================================================================
// JsxPropBlock — a prop whose value is a JSX element tree.
// =============================================================================

export interface JsxPropBlockProps {
  /** Prop name (e.g. `toolbar`). */
  name: string;
  /** Indentation depth for the opening `name={` line. */
  indent?: number;
  /** The JSX element tree rendered between the braces. */
  children: ReactNode;
}

/**
 * Renders a prop whose value spans multiple lines of JSX:
 *
 * ```
 *   toolbar={
 *     <ContentListToolbar>
 *       ...
 *     </ContentListToolbar>
 *   }
 * ```
 */
export const JsxPropBlock = ({ name, indent = 0, children }: JsxPropBlockProps) => {
  const styles = useThemeStyles();

  return (
    <div css={[baseFontCss, css({ paddingLeft: indent * 16, width: '100%' })]}>
      <div css={rowCss}>
        <span css={styles.propName}>{name}</span>
        <span css={styles.brace}>={'{'}</span>
      </div>
      <div css={childrenBlockCss}>
        {React.Children.map(children, (child) => (
          <div css={childRowCss}>{child}</div>
        ))}
      </div>
      <div css={rowCss}>
        <span css={styles.brace}>{'}'}</span>
      </div>
    </div>
  );
};

// =============================================================================
// JsxBlock
// =============================================================================

export interface JsxBlockProps {
  /** Component name for the opening/closing tags. */
  name: string;
  /** Indentation depth. */
  indent?: number;
  /** Inline prop editors for the opening tag. */
  props?: ReactNode;
  /** Block children rendered between opening and closing tags. */
  children?: ReactNode;
}

/**
 * Renders a JSX block with opening tag, children, and closing tag.
 */
export const JsxBlock = ({ name, indent = 0, props, children }: JsxBlockProps) => (
  <>
    <JsxTag name={name} indent={indent}>
      {props}
    </JsxTag>
    {children}
    <JsxTag name={name} closing indent={indent} />
  </>
);

// =============================================================================
// JsxComment
// =============================================================================

export interface JsxCommentProps {
  indent?: number;
  children: ReactNode;
}

/**
 * Renders a JSX-style comment: `{/* ... *​/}`.
 */
export const JsxComment = ({ indent = 0, children }: JsxCommentProps) => {
  const styles = useThemeStyles();

  return (
    <div css={[baseFontCss, rowCss, styles.comment, css({ paddingLeft: indent * 16 })]}>
      {'/* '}
      {children}
      {' */'}
    </div>
  );
};
