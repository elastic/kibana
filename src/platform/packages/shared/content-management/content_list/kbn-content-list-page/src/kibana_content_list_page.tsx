/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useId, useMemo, type ReactNode } from 'react';
import type { EuiPageHeaderProps } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

const DEFAULT_DATA_TEST_SUBJ = 'kibana-content-list-page';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface KibanaContentListPageContextValue {
  /**
   * DOM `id` set on the heading element rendered by `Header`. `Section` uses
   * this value as its default `aria-labelledby` when explicitly overridden,
   * but does not default to it — callers that omit `Header` should provide an
   * explicit `aria-labelledby` on `Section` to avoid referencing a missing
   * element.
   */
  readonly headingId: string;
  /** Root `data-test-subj`; consumed by child components to derive their subjects. */
  readonly dataTestSubj: string;
}

const KibanaContentListPageContext = createContext<KibanaContentListPageContextValue | null>(null);

const useKibanaContentListPageContext = (consumer: string): KibanaContentListPageContextValue => {
  const value = useContext(KibanaContentListPageContext);
  if (value === null) {
    throw new Error(`\`${consumer}\` must be rendered inside \`<KibanaContentListPage>\`.`);
  }
  return value;
};

// ---------------------------------------------------------------------------
// KibanaContentListPage.Header
// ---------------------------------------------------------------------------

export interface KibanaContentListPageHeaderProps {
  /** Page title rendered as the page-level heading. */
  title: ReactNode;
  /** Optional supporting copy rendered next to the title. */
  description?: ReactNode;
  /**
   * One or more action nodes rendered to the right of the page title.
   *
   * Pass an array when multiple independent action slots are needed, or a
   * single element/fragment when the actions should render as one slot in
   * {@link KibanaPageTemplate.Header}'s `rightSideItems`.
   */
  actions?: ReactNode;
  /**
   * Tab items rendered below the page title, forwarded to
   * {@link KibanaPageTemplate.Header}'s `tabs` prop.
   */
  tabs?: EuiPageHeaderProps['tabs'];
  /** Override the `data-test-subj`. Defaults to `<page data-test-subj>-header`. */
  'data-test-subj'?: string;
}

const KibanaContentListPageHeader = ({
  title,
  description,
  actions,
  tabs,
  'data-test-subj': dataTestSubjProp,
}: KibanaContentListPageHeaderProps) => {
  const { headingId, dataTestSubj: pageDataTestSubj } = useKibanaContentListPageContext(
    'KibanaContentListPage.Header'
  );

  const dataTestSubj = dataTestSubjProp ?? `${pageDataTestSubj}-header`;
  const rightSideItems = actions == null ? undefined : Array.isArray(actions) ? actions : [actions];

  return (
    <KibanaPageTemplate.Header
      pageTitle={
        <span id={headingId} data-test-subj={`${pageDataTestSubj}-title`}>
          {title}
        </span>
      }
      description={
        description == null ? undefined : (
          <span data-test-subj={`${pageDataTestSubj}-description`}>{description}</span>
        )
      }
      rightSideItems={rightSideItems}
      tabs={tabs}
      data-test-subj={dataTestSubj}
    />
  );
};

// ---------------------------------------------------------------------------
// KibanaContentListPage.Section
// ---------------------------------------------------------------------------

export interface KibanaContentListPageSectionProps {
  children: ReactNode;
  /**
   * Override the default `aria-labelledby` (which points at the page heading
   * rendered by {@link KibanaContentListPage.Header}).
   *
   * Always provide an explicit value when using `Section` without a `Header`
   * sibling — omitting it will cause `aria-labelledby` to reference a missing
   * element, which is invalid for accessibility.
   */
  'aria-labelledby'?: string;
  /** Override the default `data-test-subj`. Defaults to `<page data-test-subj>-section`. */
  'data-test-subj'?: string;
}

const KibanaContentListPageSection = ({
  children,
  'aria-labelledby': ariaLabelledBy,
  'data-test-subj': dataTestSubjProp,
}: KibanaContentListPageSectionProps) => {
  const { headingId, dataTestSubj: pageDataTestSubj } = useKibanaContentListPageContext(
    'KibanaContentListPage.Section'
  );

  // Apply aria-labelledby only when an explicit prop is provided. When the
  // default from context is used, it relies on <Header> being rendered in the
  // same page; callers that render <Section> without <Header> must pass an
  // explicit aria-labelledby to avoid referencing a missing element.
  return (
    <KibanaPageTemplate.Section
      aria-labelledby={ariaLabelledBy ?? headingId}
      data-test-subj={dataTestSubjProp ?? `${pageDataTestSubj}-section`}
    >
      {children}
    </KibanaPageTemplate.Section>
  );
};

// ---------------------------------------------------------------------------
// KibanaContentListPage (root)
// ---------------------------------------------------------------------------

export interface KibanaContentListPageProps {
  /**
   * Page content. Compose with {@link KibanaContentListPage.Header} and
   * {@link KibanaContentListPage.Section} for consistent page chrome and
   * `aria-labelledby` wiring.
   */
  children: ReactNode;
  /**
   * Override the heading element `id` shared between {@link KibanaContentListPage.Header}
   * and {@link KibanaContentListPage.Section}. Both components read from the same
   * context value, so `Header` and `Section` are always synchronized.
   */
  headingId?: string;
  /** Override the root `data-test-subj`. */
  'data-test-subj'?: string;
}

const KibanaContentListPageRoot = ({
  children,
  headingId: headingIdProp,
  'data-test-subj': dataTestSubj = DEFAULT_DATA_TEST_SUBJ,
}: KibanaContentListPageProps) => {
  // Generate a unique id per instance so two `KibanaContentListPage` trees
  // on the same screen never share the same heading element ID.
  const generatedHeadingId = useId();
  const headingId = headingIdProp ?? generatedHeadingId;

  const contextValue = useMemo<KibanaContentListPageContextValue>(
    () => ({ headingId, dataTestSubj }),
    [headingId, dataTestSubj]
  );

  return (
    <KibanaContentListPageContext.Provider value={contextValue}>
      <KibanaPageTemplate panelled data-test-subj={dataTestSubj}>
        {children}
      </KibanaPageTemplate>
    </KibanaContentListPageContext.Provider>
  );
};

/**
 * Kibana-specific page shell for content listing pages.
 *
 * A thin wrapper over {@link KibanaPageTemplate} that wires up a shared heading
 * `id` and `data-test-subj` for child components. Use the compound components
 * to build the page:
 *
 * - {@link KibanaContentListPage.Header} — page title, description, and actions.
 * - {@link KibanaContentListPage.Section} — a labelled `KibanaPageTemplate.Section`.
 *
 * @example
 * ```tsx
 * <KibanaContentListPage>
 *   <KibanaContentListPage.Header title="Maps" actions={<CreateButton />} />
 *   <KibanaContentListPage.Section>
 *     <ContentList>
 *       <ContentListToolbar />
 *       <ContentListTable title="Maps" />
 *       <ContentListFooter />
 *     </ContentList>
 *   </KibanaContentListPage.Section>
 * </KibanaContentListPage>
 * ```
 */
export const KibanaContentListPage = Object.assign(KibanaContentListPageRoot, {
  Header: KibanaContentListPageHeader,
  Section: KibanaContentListPageSection,
});
