import React, { type ReactNode } from 'react';
import type { EuiPageHeaderProps } from '@elastic/eui';
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
    /**
     * Forwarded to {@link KibanaPageTemplate}'s `restrictWidth` prop.
     *
     * Defaults to `false` so listing pages run full-width — the
     * `ContentListTable` column presets each have their own `maxWidth` cap, so
     * trailing whitespace lives inside the table rather than as a centred
     * page-section gutter. This intentionally overrides EUI's `true` default
     * (which resolves to a 1200px page cap and would prevent column
     * `maxWidth` defaults from engaging on wide viewports).
     *
     * Pass `true` for the EUI default (1200px), or a specific number/string
     * to centre the page chrome at a custom width.
     */
    restrictWidth?: boolean | number | string;
    /** Override the root `data-test-subj`. */
    'data-test-subj'?: string;
}
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
 * The page renders full-width by default (`restrictWidth={false}`). The
 * `ContentListTable` column presets each have their own `maxWidth` cap, so
 * trailing whitespace lives inside the table rather than as a centred
 * page-section gutter. Pass `restrictWidth={true}` (or a specific
 * number/string) to opt back into a centred page chrome.
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
 *
 * @example Restrict the page width (legacy 1200px chrome)
 * ```tsx
 * <KibanaContentListPage restrictWidth>
 *   <KibanaContentListPage.Header title="Maps" />
 *   <KibanaContentListPage.Section>{...}</KibanaContentListPage.Section>
 * </KibanaContentListPage>
 * ```
 */
export declare const KibanaContentListPage: (({ children, headingId: headingIdProp, restrictWidth, "data-test-subj": dataTestSubj, }: KibanaContentListPageProps) => React.JSX.Element) & {
    Header: ({ title, description, actions, tabs, "data-test-subj": dataTestSubjProp, }: KibanaContentListPageHeaderProps) => React.JSX.Element;
    Section: ({ children, "aria-labelledby": ariaLabelledBy, "data-test-subj": dataTestSubjProp, }: KibanaContentListPageSectionProps) => React.JSX.Element;
};
