/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext, useMemo, useState } from 'react';
import useLatest from 'react-use/lib/useLatest';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiPopover,
  EuiText,
  EuiTitle,
  EuiToolTip,
  Query,
  useEuiTheme,
  useGeneratedHtmlId,
  useResizeObserver,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentListItem } from '@kbn/content-list';
import type { ActiveFilters } from '@kbn/content-list-provider';
import {
  ContentList,
  ContentListFooter,
  ContentListTable,
  ContentListToolbar,
  useContentListFilters,
  useContentListSearch,
  useContentListState,
  useFilterToggle,
} from '@kbn/content-list';
import {
  ContentListClientProvider,
  createFilterControl,
  defineContentListFilter,
  defineContentListSortField,
  useClientFilterCounts,
  type TableListViewFindItemsFn,
} from '@kbn/content-list-provider-client';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type {
  HousekeepingFinding,
  HousekeepingFindingGroup,
  HousekeepingFindingKind,
  HousekeepingFindingSeverity,
} from '../../common';
import { HOUSEKEEPING_FINDING_KINDS, isFindingKind } from '../../common';
import {
  AskAgentContext,
  ContentListCoreContext,
  FINDING_KIND_METADATA,
  FINDING_SEVERITY_METADATA,
  FindingActionsContext,
  ResourceTypesContext,
} from '../metadata';
import { ResourceName, ResourceTypeBadge } from './resource_badge';
import { FixPanel } from './fix_panel';
import { normalizeSearchQuery } from './normalize_search_query';

const i18nTexts = {
  entity: i18n.translate('housekeeping.list.entity', {
    defaultMessage: 'finding',
  }),
  entityPlural: i18n.translate('housekeeping.list.entityPlural', {
    defaultMessage: 'findings',
  }),
  caption: i18n.translate('housekeeping.list.caption', {
    defaultMessage: 'Findings',
  }),
  searchPlaceholder: i18n.translate('housekeeping.list.searchPlaceholder', {
    defaultMessage: 'Search by resource name',
  }),
  resource: i18n.translate('housekeeping.list.resource', {
    defaultMessage: 'Resource',
  }),
  type: i18n.translate('housekeeping.list.type', {
    defaultMessage: 'Type',
  }),
  kind: i18n.translate('housekeeping.list.kind', {
    defaultMessage: 'Finding',
  }),
  severity: i18n.translate('housekeeping.list.severity', {
    defaultMessage: 'Severity',
  }),
  problem: i18n.translate('housekeeping.list.problem', {
    defaultMessage: 'Problem',
  }),
  actions: i18n.translate('housekeeping.list.actions', {
    defaultMessage: 'Actions',
  }),
  showFix: i18n.translate('housekeeping.list.showFix', {
    defaultMessage: 'Show the fix',
  }),
  askAgent: i18n.translate('housekeeping.list.askAgent', {
    defaultMessage: 'Ask AI Agent',
  }),
  noMatches: i18n.translate('housekeeping.list.noMatches', {
    defaultMessage: 'No findings match your search.',
  }),
};

/** Below this width, as in any flyout, the resource type and the kind move under the resource name. */
const COMPACT_LIST_WIDTH = 900;

interface FindingFields {
  group: HousekeepingFindingGroup;
  finding: HousekeepingFinding;
  kind: HousekeepingFindingKind;
  typeLabel: string;
  problem: string;
}

type FindingContent = UserContentCommonSchema & FindingFields;
type FindingListItem = ContentListItem<FindingFields>;

// `Column.render` gives the base item type, without the fields that `findItems` added.
const asFinding = (item: ContentListItem) => item as unknown as FindingListItem;

const KindBadge = ({ kind }: { kind: HousekeepingFindingKind }) => {
  const { badgeColor, label } = FINDING_KIND_METADATA[kind];
  return <EuiBadge color={badgeColor}>{label}</EuiBadge>;
};

const SeverityBadge = ({ severity }: { severity: HousekeepingFindingSeverity }) => {
  const { badgeColor, label } = FINDING_SEVERITY_METADATA[severity];
  return <EuiBadge color={badgeColor}>{label}</EuiBadge>;
};

/** Also its query field, so the counts, the toggle and the search use it directly. */
const KIND_FILTER_ID = 'kind';

/** Only the kinds that the run can report, so a kind that nothing reports never shows. */
const createKindFilter = (kinds: HousekeepingFindingKind[]) =>
  defineContentListFilter<FindingContent>({
    id: KIND_FILTER_ID,
    title: i18nTexts.kind,
    getItemValue: (item) => item.kind,
    options: kinds.map((kind) => ({ value: kind, label: FINDING_KIND_METADATA[kind].label })),
  });

const createKindFilterControl = (kindFilter: ReturnType<typeof createKindFilter>) =>
  createFilterControl(kindFilter, {
    renderOptionContent: ({ value, label }) =>
      isFindingKind(value) ? <KindBadge kind={value} /> : label,
    'data-test-subj': 'housekeepingKindFilter',
  });
// By label, so legacy and composable index templates are one type.
const typeFilter = defineContentListFilter<FindingContent>({
  id: 'resourceType',
  title: i18nTexts.type,
  getItemValue: (item) => item.typeLabel,
});
const problemFilter = defineContentListFilter<FindingContent>({
  id: 'problem',
  title: i18nTexts.problem,
  getItemValue: (item) => item.problem,
});

const TypeFilter = createFilterControl(typeFilter, {
  'data-test-subj': 'housekeepingTypeFilter',
});
const ProblemFilter = createFilterControl(problemFilter, {
  'data-test-subj': 'housekeepingProblemFilter',
});

const SEVERITY_ORDER: HousekeepingFindingSeverity[] = ['critical', 'warning'];

const sortFields = {
  kind: defineContentListSortField<FindingContent>({
    id: 'kind',
    title: i18nTexts.kind,
    getValue: (item) => HOUSEKEEPING_FINDING_KINDS.indexOf(item.kind),
  }),
  severity: defineContentListSortField<FindingContent>({
    id: 'severity',
    title: i18nTexts.severity,
    getValue: ({ finding: { severity } }) =>
      severity ? SEVERITY_ORDER.indexOf(severity) : SEVERITY_ORDER.length,
  }),
  resourceType: defineContentListSortField<FindingContent>({
    id: 'resourceType',
    title: i18nTexts.type,
    getValue: (item) => item.typeLabel,
  }),
  problem: defineContentListSortField<FindingContent>({
    id: 'problem',
    title: i18nTexts.problem,
    getValue: (item) => item.problem,
  }),
};

const matchesQuery = (finding: HousekeepingFinding, query: string) =>
  [finding.resource, ...finding.related].some(({ id }) => id.toLowerCase().includes(query));

/** The values a filter includes; flags and the search text have none. */
const getIncludedValues = (filter: ActiveFilters[string]) =>
  typeof filter === 'object' && 'include' in filter ? filter.include ?? [] : [];

/**
 * The kind filter as counts: the same counts and selection as the toolbar control. Each count
 * explains its kind, in a tooltip when the list is compact.
 */
const KindStats = ({
  kinds,
  isCompact,
}: {
  kinds: HousekeepingFindingKind[];
  isCompact: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const counts = useClientFilterCounts(KIND_FILTER_ID);
  const { filters } = useContentListFilters();
  const toggleKind = useFilterToggle(KIND_FILTER_ID);
  const selected = getIncludedValues(filters[KIND_FILTER_ID]);

  return (
    <EuiFlexGroup gutterSize="s" responsive={false} data-test-subj="housekeepingSummary">
      {kinds.map((kind) => {
        const { summaryLabel, description, countColor } = FINDING_KIND_METADATA[kind];
        const count = counts.get(kind) ?? 0;
        const isSelected = selected.includes(kind);
        const tile = (
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="m"
            color={isSelected ? 'primary' : 'plain'}
            onClick={() => toggleKind(kind)}
            aria-pressed={isSelected}
            aria-label={i18n.translate('housekeeping.list.kindCountAriaLabel', {
              defaultMessage: '{kind}: {count}. {description}',
              values: { kind: summaryLabel, count, description },
            })}
            data-test-subj={`housekeepingSummary-${kind}`}
            css={{ height: '100%' }}
          >
            {/* Full height, so labels that wrap in a flyout don't misalign the counts. */}
            <EuiFlexGroup
              component="span"
              direction="column"
              gutterSize="s"
              responsive={false}
              css={{ height: '100%' }}
            >
              <EuiTitle size="xxs">
                <span>{summaryLabel}</span>
              </EuiTitle>
              {/* Inside a span, because the title sets its own color on its child. */}
              <EuiTitle size="m">
                {/* At the bottom in the flyout, where labels take one or two lines. */}
                <span css={isCompact ? { marginTop: 'auto' } : undefined}>
                  <span
                    css={{
                      color: count > 0 && countColor ? euiTheme.colors[countColor] : undefined,
                    }}
                  >
                    {count}
                  </span>
                </span>
              </EuiTitle>
              {!isCompact && (
                <EuiText component="span" size="xs" color="subdued">
                  {description}
                </EuiText>
              )}
            </EuiFlexGroup>
          </EuiPanel>
        );
        return (
          <EuiFlexItem key={kind}>
            {isCompact ? (
              <EuiToolTip
                content={description}
                display="block"
                anchorProps={{ css: { height: '100%' } }}
              >
                {tile}
              </EuiToolTip>
            ) : (
              tile
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

const FixButton = ({ item }: { item: FindingListItem }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { fix } = item.finding;
  if (!fix) {
    return null;
  }
  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="leftCenter"
      panelPaddingSize="none"
      panelProps={{ css: { width: 480, maxWidth: '80vw' } }}
      aria-label={i18nTexts.showFix}
      button={
        <EuiToolTip content={i18nTexts.showFix} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="wrench"
            color="text"
            aria-label={i18nTexts.showFix}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj="housekeepingFixToggle"
          />
        </EuiToolTip>
      }
    >
      <FixPanel fix={fix} />
    </EuiPopover>
  );
};

const FindingActions = ({ item }: { item: FindingListItem }) => {
  const askAgent = useContext(AskAgentContext);
  const getFindingActions = useContext(FindingActionsContext);
  const { group, finding, typeLabel } = item;

  return (
    <EuiFlexGroup gutterSize="xs" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <FixButton item={item} />
      </EuiFlexItem>
      {getFindingActions(finding).map(({ label, iconType, onClick }) => (
        <EuiFlexItem grow={false} key={label}>
          <EuiToolTip content={label} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType={iconType}
              color="text"
              aria-label={label}
              onClick={onClick}
              data-test-subj="housekeepingFindingAction"
            />
          </EuiToolTip>
        </EuiFlexItem>
      ))}
      {askAgent && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={i18nTexts.askAgent} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="productAgent"
              color="text"
              aria-label={i18nTexts.askAgent}
              onClick={() => askAgent({ group, finding, resourceTypeLabel: typeLabel })}
              data-test-subj="housekeepingAskAgent"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const ResourceCell = ({ item, isCompact }: { item: FindingListItem; isCompact: boolean }) => {
  const { finding, kind } = item;
  const details = finding.details ?? [];

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      css={{ minWidth: 0, overflowWrap: 'break-word' }}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <ResourceName resource={finding.resource} />
        </EuiText>
      </EuiFlexItem>
      {isCompact && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" wrap responsive={false} css={{ marginBlock: 4 }}>
            <EuiFlexItem grow={false}>
              <ResourceTypeBadge type={finding.resource.type} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <KindBadge kind={kind} />
            </EuiFlexItem>
            {finding.severity && (
              <EuiFlexItem grow={false}>
                <SeverityBadge severity={finding.severity} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
      {details.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {details.join(' · ')}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const ProblemCell = ({ item }: { item: FindingListItem }) => {
  const { group, finding } = item;
  // The impact repeats across the rows of a problem, so it is behind the icon.
  const explanation = [group.description, finding.message].filter(Boolean);
  if (explanation.length === 0) {
    return <EuiText size="s">{group.title}</EuiText>;
  }
  // The icon wraps with the last word, never on a line of its own.
  const lastWordStart = group.title.lastIndexOf(' ') + 1;
  return (
    <EuiText size="s">
      {group.title.slice(0, lastWordStart)}
      <span css={{ whiteSpace: 'nowrap' }}>
        {group.title.slice(lastWordStart)}{' '}
        <EuiIconTip
          type="info"
          color="subdued"
          content={explanation.map((text) => (
            <p key={text}>{text}</p>
          ))}
        />
      </span>
    </EuiText>
  );
};

/**
 * Refreshes the list when the checks run again, keeping the search and the filters. The kind
 * filter goes away when the run leaves it without findings, so the list isn't empty.
 */
const RefetchOnChange = ({ groups }: { groups: HousekeepingFindingGroup[] }) => {
  const { refetch } = useContentListState();
  const { queryText, setQueryFromText } = useContentListSearch();
  const { filters } = useContentListFilters();
  const selectedKinds = getIncludedValues(filters[KIND_FILTER_ID]);

  useUpdateEffect(() => {
    if (
      selectedKinds.length > 0 &&
      !groups.some(({ kind, findings }) => findings.length > 0 && selectedKinds.includes(kind))
    ) {
      setQueryFromText(
        Query.parse(queryText)
          .removeOrFieldClauses(KIND_FILTER_ID)
          .removeSimpleFieldClauses(KIND_FILTER_ID).text
      );
    }
    refetch();
  }, [groups]);
  return null;
};

/**
 * The table of findings. The severity column shows only when a finding of the selected kinds has one,
 * such as deprecations.
 */
const FindingsListTable = ({
  groups,
  isCompact,
}: {
  groups: HousekeepingFindingGroup[];
  isCompact: boolean;
}) => {
  const { filters } = useContentListFilters();
  const selectedKinds = getIncludedValues(filters[KIND_FILTER_ID]);
  const shown = groups
    .filter(({ kind }) => selectedKinds.includes(kind))
    .flatMap(({ findings }) => findings);
  const showsSeverity = !isCompact && shown.some(({ severity }) => severity !== undefined);
  const { Column } = ContentListTable;

  return (
    <ContentListTable
      // The table reads its columns only when it mounts.
      key={`${isCompact}-${showsSeverity}`}
      title={i18nTexts.caption}
      noItemsMessage={i18nTexts.noMatches}
      data-test-subj="housekeepingFindingsTable"
    >
      <Column
        id="title"
        name={i18nTexts.resource}
        sortable
        // No width, so it takes the space the other columns leave.
        minWidth="10em"
        data-test-subj="housekeepingResource"
        render={(item) => <ResourceCell item={asFinding(item)} isCompact={isCompact} />}
      />
      {!isCompact && (
        <Column
          id="resourceType"
          name={i18nTexts.type}
          sortable
          width="11em"
          data-test-subj="housekeepingType"
          render={(item) => <ResourceTypeBadge type={asFinding(item).finding.resource.type} />}
        />
      )}
      {!isCompact && (
        <Column
          id="kind"
          name={i18nTexts.kind}
          sortable
          width="10em"
          data-test-subj="housekeepingKind"
          render={(item) => <KindBadge kind={asFinding(item).kind} />}
        />
      )}
      {showsSeverity && (
        <Column
          id="severity"
          name={i18nTexts.severity}
          sortable
          width="8em"
          data-test-subj="housekeepingSeverity"
          render={(item) => {
            const { severity } = asFinding(item).finding;
            return severity && <SeverityBadge severity={severity} />;
          }}
        />
      )}
      <Column
        id="problem"
        name={i18nTexts.problem}
        sortable
        width={isCompact ? '9em' : '16em'}
        data-test-subj="housekeepingProblem"
        render={(item) => <ProblemCell item={asFinding(item)} />}
      />
      <Column
        id="actions"
        name={i18nTexts.actions}
        // Four icons at most.
        width="136px"
        render={(item) => <FindingActions item={asFinding(item)} />}
      />
    </ContentListTable>
  );
};

/** Every finding in one list, filtered by kind, resource type and problem. */
export const FindingsTable = ({
  groups,
  kinds = HOUSEKEEPING_FINDING_KINDS,
}: {
  groups: HousekeepingFindingGroup[];
  /** The kinds that the run can report. */
  kinds?: HousekeepingFindingKind[];
}) => {
  const kindFilter = useMemo(() => createKindFilter(kinds), [kinds]);
  const KindFilter = useMemo(() => createKindFilterControl(kindFilter), [kindFilter]);
  const core = useContext(ContentListCoreContext);
  const resourceTypes = useContext(ResourceTypesContext);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { width } = useResizeObserver(container, 'width');
  const isCompact = width > 0 && width < COMPACT_LIST_WIDTH;
  // Per mount, so a list never shows the cached findings of another scope.
  const queryKeyScope = useGeneratedHtmlId({ prefix: 'housekeepingFindings' });

  // Stable, so the content list keeps one cache that `RefetchOnChange` can clear.
  const latest = useLatest({ groups, resourceTypes });
  const findItems = useMemo<TableListViewFindItemsFn>(
    () => async (searchQuery) => {
      const query = normalizeSearchQuery(searchQuery);
      const hits: FindingContent[] = latest.current.groups.flatMap((group) =>
        group.findings
          .filter((finding) => !query || matchesQuery(finding, query))
          .map((finding) => ({
            id: `${group.id}|${finding.id}`,
            type: finding.resource.type,
            updatedAt: '',
            references: [],
            attributes: { title: finding.resource.id },
            group,
            finding,
            kind: group.kind,
            typeLabel:
              latest.current.resourceTypes[finding.resource.type]?.label ?? finding.resource.type,
            problem: group.title,
          }))
      );
      return { total: hits.length, hits };
    },
    [latest]
  );

  // Opens on the most urgent kind with findings: broken references are what needs fixing.
  const [initialSearch] = useState(() => {
    const kind = HOUSEKEEPING_FINDING_KINDS.find((candidate) =>
      groups.some((group) => group.kind === candidate)
    );
    return kind
      ? Query.parse('').addOrFieldValue(KIND_FILTER_ID, FINDING_KIND_METADATA[kind].label).text
      : '';
  });

  if (!core) {
    return null;
  }

  return (
    <div ref={setContainer}>
      <ContentListClientProvider
        id="housekeeping-findings"
        queryKeyScope={queryKeyScope}
        core={core}
        labels={{
          entity: i18nTexts.entity,
          entityPlural: i18nTexts.entityPlural,
          searchPlaceholder: i18nTexts.searchPlaceholder,
        }}
        findItems={findItems}
        features={{
          urlSync: false,
          selection: false,
          search: { initialSearch },
          sorting: { initialSort: { field: 'kind', direction: 'asc' }, fields: sortFields },
          pagination: { initialPageSize: 20, pageSizeOptions: [10, 20, 50] },
          filters: {
            [kindFilter.id]: kindFilter,
            [typeFilter.id]: typeFilter,
            [problemFilter.id]: problemFilter,
          },
        }}
      >
        <RefetchOnChange groups={groups} />
        <ContentList>
          <ContentListToolbar data-test-subj="housekeepingToolbar">
            <ContentListToolbar.Filters>
              <KindFilter />
              <TypeFilter />
              <ProblemFilter />
            </ContentListToolbar.Filters>
          </ContentListToolbar>
          <KindStats kinds={kinds} isCompact={isCompact} />
          <FindingsListTable groups={groups} isCompact={isCompact} />
          <ContentListFooter />
        </ContentList>
      </ContentListClientProvider>
    </div>
  );
};
