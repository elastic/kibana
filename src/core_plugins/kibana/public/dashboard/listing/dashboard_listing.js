import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import 'ui/pager_control';
import 'ui/pager';
import './dashboard_listing.less';
import { DashboardConstants, createDashboardEditUrl } from '../dashboard_constants';
import { SortableProperties } from '@elastic/eui';
import { ConfirmationButtonTypes } from 'ui/modals';

export function DashboardListingController($injector, $scope, $location) {
  const $filter = $injector.get('$filter');
  const confirmModal = $injector.get('confirmModal');
  const Notifier = $injector.get('Notifier');
  const pagerFactory = $injector.get('pagerFactory');
  const Private = $injector.get('Private');
  const timefilter = $injector.get('timefilter');
  const config = $injector.get('config');
  const dashboardConfig = $injector.get('dashboardConfig');

  timefilter.disableAutoRefreshSelector();
  timefilter.disableTimeRangeSelector();

  const limitTo = $filter('limitTo');
  // TODO: Extract this into an external service.
  const services = Private(SavedObjectRegistryProvider).byLoaderPropertiesName;
  const dashboardService = services.dashboards;
  const notify = new Notifier({ location: 'Dashboard' });

  let selectedItems = [];
  const sortableProperties = new SortableProperties([
    {
      name: 'title',
      getValue: item => item.title.toLowerCase(),
      isAscending: true,
    },
    {
      name: 'description',
      getValue: item => item.description.toLowerCase(),
      isAscending: true
    }
  ],
  'title');

  const calculateItemsOnPage = () => {
    this.items = sortableProperties.sortItems(this.items);
    this.pager.setTotalItems(this.items.length);
    this.pageOfItems = limitTo(this.items, this.pager.pageSize, this.pager.startIndex);
  };

  const fetchItems = () => {
    this.isFetchingItems = true;

    dashboardService.find(this.filter, config.get('savedObjects:listingLimit'))
      .then(result => {
        this.isFetchingItems = false;
        this.items = result.hits;
        this.totalItems = result.total;
        this.showLimitError = result.total > config.get('savedObjects:listingLimit');
        this.listingLimit = config.get('savedObjects:listingLimit');
        calculateItemsOnPage();
      });
  };

  const deselectAll = () => {
    selectedItems = [];
  };

  const selectAll = () => {
    selectedItems = this.pageOfItems.slice(0);
  };

  this.isFetchingItems = false;
  this.items = [];
  this.pageOfItems = [];
  this.filter = ($location.search()).filter || '';

  this.pager = pagerFactory.create(this.items.length, 20, 1);

  this.hideWriteControls = dashboardConfig.getHideWriteControls();

  $scope.$watch(() => this.filter, () => {
    deselectAll();
    fetchItems();
    $location.search('filter', this.filter);
  });
  this.isAscending = (name) => sortableProperties.isAscendingByName(name);
  this.getSortedProperty = () => sortableProperties.getSortedProperty();

  this.sortOn = function sortOn(propertyName) {
    sortableProperties.sortOn(propertyName);
    deselectAll();
    calculateItemsOnPage();
  };

  this.toggleAll = function toggleAll() {
    if (this.areAllItemsChecked()) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  this.toggleItem = function toggleItem(item) {
    if (this.isItemChecked(item)) {
      const index = selectedItems.indexOf(item);
      selectedItems.splice(index, 1);
    } else {
      selectedItems.push(item);
    }
  };

  this.isItemChecked = function isItemChecked(item) {
    return selectedItems.indexOf(item) !== -1;
  };

  this.areAllItemsChecked = function areAllItemsChecked() {
    return this.getSelectedItemsCount() === this.pageOfItems.length;
  };

  this.getSelectedItemsCount = function getSelectedItemsCount() {
    return selectedItems.length;
  };

  this.deleteSelectedItems = function deleteSelectedItems() {
    const doDelete = () => {
      const selectedIds = selectedItems.map(item => item.id);

      dashboardService.delete(selectedIds)
        .then(fetchItems)
        .then(() => {
          deselectAll();
        })
        .catch(error => notify.error(error));
    };

    confirmModal(
      `You can't recover deleted dashboards.`,
      {
        confirmButtonText: 'Delete',
        onConfirm: doDelete,
        defaultFocusedButton: ConfirmationButtonTypes.CANCEL,
        title: 'Delete selected dashboards?'
      });
  };

  this.onPageNext = () => {
    deselectAll();
    this.pager.nextPage();
    calculateItemsOnPage();
  };

  this.onPagePrevious = () => {
    deselectAll();
    this.pager.previousPage();
    calculateItemsOnPage();
  };

  this.getUrlForItem = function getUrlForItem(item) {
    return `#${createDashboardEditUrl(item.id)}`;
  };

  this.getEditUrlForItem = function getEditUrlForItem(item) {
    return `#${createDashboardEditUrl(item.id)}?_a=(viewMode:edit)`;
  };

  this.getCreateDashboardHref = function getCreateDashboardHref() {
    return `#${DashboardConstants.CREATE_NEW_DASHBOARD_URL}`;
  };
}
