/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import chrome from 'ui/chrome';

import {
  CommonProps,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFieldSearch,
  // @ts-ignore
  EuiFilterGroup,
  // @ts-ignore
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiListGroup,
  // @ts-ignore
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiPagination,
  EuiPopover,
  EuiSpacer,
  EuiTablePagination,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { SavedObjectAttributes } from '../../../../server/saved_objects';
import { SimpleSavedObject } from '../simple_saved_object';

// TODO the typings for EuiListGroup are incorrect - maxWidth is missing. This can be removed when the types are adjusted
const FixedEuiListGroup = (EuiListGroup as any) as React.SFC<CommonProps & { maxWidth: boolean }>;

export interface SavedObjectMetaData<T extends SavedObjectAttributes> {
  type: string;
  name: string;
  getIconForSavedObject(savedObject: SimpleSavedObject<T>): string | undefined;
  showSavedObject(savedObject: SimpleSavedObject<T>): boolean;
}

interface SavedObjectFinderState {
  items: Array<{
    title: string | null;
    id: SimpleSavedObject<SavedObjectAttributes>['id'];
    type: SimpleSavedObject<SavedObjectAttributes>['type'];
    savedObject: SimpleSavedObject<SavedObjectAttributes>;
  }>;
  filter: string;
  isFetchingItems: boolean;
  page: number;
  perPage: number;
  sortField?: string;
  sortDirection?: Direction;
  filterOpen: boolean;
  filteredTypes: string[];
}

interface BaseSavedObjectFinder {
  callToActionButton?: React.ReactNode;
  onChoose?: (
    id: SimpleSavedObject<SavedObjectAttributes>['id'],
    type: SimpleSavedObject<SavedObjectAttributes>['type'],
    name: string
  ) => void;
  noItemsMessage?: React.ReactNode;
  savedObjectMetaData: Array<SavedObjectMetaData<SavedObjectAttributes>>;
  showFilter?: boolean;
}

interface SavedObjectFinderFixedPage extends BaseSavedObjectFinder {
  initialPageSize?: undefined;
  fixedPageSize: number;
}

interface SavedObjectFinderInitialPageSize extends BaseSavedObjectFinder {
  initialPageSize?: 5 | 10 | 15 | 25;
  fixedPageSize?: undefined;
}
type SavedObjectFinderProps = SavedObjectFinderFixedPage | SavedObjectFinderInitialPageSize;

class SavedObjectFinder extends React.Component<SavedObjectFinderProps, SavedObjectFinderState> {
  public static propTypes = {
    callToActionButton: PropTypes.node,
    onChoose: PropTypes.func,
    noItemsMessage: PropTypes.node,
    savedObjectMetaData: PropTypes.array.isRequired,
    initialPageSize: PropTypes.oneOf([5, 10, 15, 25]),
    fixedPageSize: PropTypes.number,
    showFilter: PropTypes.bool,
  };

  private isComponentMounted: boolean = false;

  private debouncedFetch = _.debounce(async (filter: string) => {
    const metaDataMap = this.getSavedObjectMetaDataMap();

    const resp = await chrome.getSavedObjectsClient().find({
      type: Object.keys(metaDataMap),
      fields: ['title', 'visState'],
      search: filter ? `${filter}*` : undefined,
      page: 1,
      perPage: chrome.getUiSettingsClient().get('savedObjects:listingLimit'),
      searchFields: ['title^3', 'description'],
      defaultSearchOperator: 'AND',
    });

    resp.savedObjects = resp.savedObjects.filter(
      savedObject =>
        metaDataMap[savedObject.type] && metaDataMap[savedObject.type].showSavedObject(savedObject)
    );

    if (!this.isComponentMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (filter === this.state.filter) {
      this.setState({
        isFetchingItems: false,
        items: resp.savedObjects.map(savedObject => {
          const {
            attributes: { title },
            id,
            type,
          } = savedObject;
          return {
            title: typeof title === 'string' ? title : '',
            id,
            type,
            savedObject,
          };
        }),
      });
    }
  }, 300);

  constructor(props: SavedObjectFinderProps) {
    super(props);

    this.state = {
      items: [],
      isFetchingItems: false,
      page: 0,
      perPage: props.initialPageSize || props.fixedPageSize || 15,
      filter: '',
      filterOpen: false,
      filteredTypes: [],
    };
  }

  public componentWillUnmount() {
    this.isComponentMounted = false;
    this.debouncedFetch.cancel();
  }

  public componentDidMount() {
    this.isComponentMounted = true;
    this.fetchItems();
  }

  public render() {
    return (
      <React.Fragment>
        {this.renderSearchBar()}
        {this.renderListing()}
      </React.Fragment>
    );
  }

  private getSavedObjectMetaDataMap(): Record<string, SavedObjectMetaData<SavedObjectAttributes>> {
    return this.props.savedObjectMetaData.reduce(
      (map, metaData) => ({ ...map, [metaData.type]: metaData }),
      {}
    );
  }

  private getPageCount() {
    return Math.ceil(
      (this.state.filteredTypes.length === 0
        ? this.state.items.length
        : this.state.items.filter(
            item =>
              this.state.filteredTypes.length === 0 || this.state.filteredTypes.includes(item.type)
          ).length) / this.state.perPage
    );
  }

  // server-side paging not supported
  // 1) saved object client does not support sorting by title because title is only mapped as analyzed
  // 2) can not search on anything other than title because all other fields are stored in opaque JSON strings,
  //    for example, visualizations need to be search by isLab but this is not possible in Elasticsearch side
  //    with the current mappings
  private getPageOfItems = () => {
    // do not sort original list to preserve elasticsearch ranking order
    const items = this.state.items.slice();
    const { sortDirection } = this.state;

    if (sortDirection || !this.state.filter) {
      items.sort(({ title: titleA }, { title: titleB }) => {
        let order = 1;
        if (sortDirection === 'desc') {
          order = -1;
        }
        return order * (titleA || '').toLowerCase().localeCompare((titleB || '').toLowerCase());
      });
    }

    // If begin is greater than the length of the sequence, an empty array is returned.
    const startIndex = this.state.page * this.state.perPage;
    // If end is greater than the length of the sequence, slice extracts through to the end of the sequence (arr.length).
    const lastIndex = startIndex + this.state.perPage;
    return items
      .filter(
        item =>
          this.state.filteredTypes.length === 0 || this.state.filteredTypes.includes(item.type)
      )
      .slice(startIndex, lastIndex);
  };

  private fetchItems = () => {
    this.setState(
      {
        isFetchingItems: true,
      },
      this.debouncedFetch.bind(null, this.state.filter)
    );
  };

  private getAvailableSavedObjectMetaData() {
    const typesInItems = new Set<string>();
    this.state.items.forEach(item => {
      typesInItems.add(item.type);
    });
    return this.props.savedObjectMetaData.filter(metaData => typesInItems.has(metaData.type));
  }

  private getCurrentSort() {
    return this.state.sortDirection || (this.state.filter ? 'auto' : 'asc');
  }

  private getCurrentSortIcon() {
    switch (this.getCurrentSort()) {
      case 'asc':
        return 'sortUp';
      case 'desc':
        return 'sortDown';
      case 'auto':
        return 'search';
    }
  }

  private getCurrentSortTooltip() {
    switch (this.getCurrentSort()) {
      case 'asc':
        return i18n.translate('common.ui.savedObjects.finder.sortAsc', {
          defaultMessage: 'Sort ascending',
        });
      case 'desc':
        return i18n.translate('common.ui.savedObjects.finder.sortDesc', {
          defaultMessage: 'Sort descending',
        });
      case 'auto':
        return i18n.translate('common.ui.savedObjects.finder.sortAuto', {
          defaultMessage: 'Sort by best match',
        });
    }
  }

  private getNextDirection(dir: Direction | undefined, hasFilter: boolean) {
    switch (dir) {
      case 'asc':
        return 'desc';
      case 'desc':
        return hasFilter ? undefined : 'asc';
      default:
        return hasFilter ? 'asc' : 'desc';
    }
  }

  private renderSearchBar() {
    const availableSavedObjectMetaData = this.getAvailableSavedObjectMetaData();

    return (
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={true}>
          <EuiFieldSearch
            placeholder={i18n.translate('common.ui.savedObjects.finder.searchPlaceholder', {
              defaultMessage: 'Search…',
            })}
            fullWidth
            value={this.state.filter}
            onChange={e => {
              this.setState(
                {
                  filter: e.target.value,
                },
                this.fetchItems
              );
            }}
            data-test-subj="savedObjectFinderSearchInput"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <EuiToolTip position="top" content={this.getCurrentSortTooltip()}>
              <EuiButtonEmpty
                size="s"
                color="text"
                data-test-subj="savedObjectFinderSortButton"
                onClick={() =>
                  this.setState(({ sortDirection, filter }) => ({
                    sortDirection: this.getNextDirection(sortDirection, Boolean(filter)),
                  }))
                }
              >
                <FormattedMessage
                  id="common.ui.savedObjects.finder.sortByLabel"
                  defaultMessage="Sort: "
                />
                <EuiIcon type={this.getCurrentSortIcon()} />
              </EuiButtonEmpty>
            </EuiToolTip>
            {this.props.showFilter && availableSavedObjectMetaData.length > 1 && (
              <EuiPopover
                id="popover"
                panelClassName="euiFilterGroup__popoverPanel"
                panelPaddingSize="none"
                isOpen={this.state.filterOpen}
                closePopover={() => this.setState({ filterOpen: false })}
                button={
                  <EuiButtonEmpty
                    onClick={() =>
                      this.setState(({ filterOpen }) => ({
                        filterOpen: !filterOpen,
                      }))
                    }
                    iconSide="right"
                    iconType="filter"
                    size="s"
                    color="text"
                    data-test-subj="savedObjectFinderFilterButton"
                  >
                    <FormattedMessage
                      id="common.ui.savedObjects.finder.filterButtonLabel"
                      defaultMessage="Filter"
                    />
                  </EuiButtonEmpty>
                }
              >
                <div className="euiFilterSelect__items">
                  <EuiText className="euiFilterSelectItem savedObjectFilterHeading" size="xs">
                    <FormattedMessage
                      id="common.ui.savedObjects.finder.filterLabel"
                      defaultMessage="Only show the following objects:"
                    />
                  </EuiText>
                  {availableSavedObjectMetaData.map(metaData => (
                    <EuiFilterSelectItem
                      key={metaData.type}
                      checked={this.state.filteredTypes.includes(metaData.type) ? 'on' : undefined}
                      data-test-subj={`savedObjectFinderFilter-${metaData.type}`}
                      onClick={() => {
                        this.setState(({ filteredTypes }) => ({
                          filteredTypes: filteredTypes.includes(metaData.type)
                            ? filteredTypes.filter(t => t !== metaData.type)
                            : [...filteredTypes, metaData.type],
                          page: 0,
                        }));
                      }}
                    >
                      {metaData.name}
                    </EuiFilterSelectItem>
                  ))}
                </div>
              </EuiPopover>
            )}
          </EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{this.props.callToActionButton}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private renderLoadingIndicator() {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiSpacer />
          <EuiLoadingSpinner data-test-subj="savedObjectFinderLoadingIndicator" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private renderListing() {
    const items = this.state.items.length === 0 ? [] : this.getPageOfItems();
    const { onChoose, savedObjectMetaData } = this.props;

    return (
      <>
        {this.state.isFetchingItems ? (
          this.renderLoadingIndicator()
        ) : items.length > 0 ? (
          <FixedEuiListGroup maxWidth={false}>
            {items.map(item => {
              const currentSavedObjectMetaData = savedObjectMetaData.find(
                metaData => metaData.type === item.type
              );
              const fullName = `${item.title} (${currentSavedObjectMetaData!.name})`;
              const iconType = (
                currentSavedObjectMetaData ||
                ({
                  getIconForSavedObject: () => 'document',
                } as Pick<SavedObjectMetaData<SavedObjectAttributes>, 'getIconForSavedObject'>)
              ).getIconForSavedObject(item.savedObject);
              return (
                <EuiListGroupItem
                  key={item.id}
                  iconType={iconType}
                  label={item.title}
                  onClick={
                    onChoose
                      ? () => {
                          onChoose(item.id, item.type, fullName);
                        }
                      : undefined
                  }
                  title={fullName}
                  data-test-subj={`savedObjectTitle${(item.title || '').split(' ').join('-')}`}
                />
              );
            })}
          </FixedEuiListGroup>
        ) : (
          <EuiEmptyPrompt body={this.props.noItemsMessage} />
        )}
        {this.props.fixedPageSize ? (
          <EuiPagination
            activePage={this.state.page}
            pageCount={this.getPageCount()}
            onPageClick={page => {
              this.setState({
                page,
              });
            }}
          />
        ) : (
          <EuiTablePagination
            activePage={this.state.page}
            pageCount={this.getPageCount()}
            onChangePage={page => {
              this.setState({
                page,
              });
            }}
            onChangeItemsPerPage={perPage => {
              this.setState({
                perPage,
              });
            }}
            itemsPerPage={this.state.perPage}
            itemsPerPageOptions={[5, 10, 15, 25]}
          />
        )}
      </>
    );
  }
}

export { SavedObjectFinder };
