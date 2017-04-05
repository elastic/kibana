import SavedObjectRegistryProvider from 'ui/saved_objects/saved_object_registry';
import 'ui/pager_control';
import 'ui/pager';
import _ from 'lodash';
import { DashboardConstants, createDashboardEditUrl } from '../dashboard_constants';

export function DashboardListingController($injector, $scope) {
  const $filter = $injector.get('$filter');
  const confirmModal = $injector.get('confirmModal');
  const Notifier = $injector.get('Notifier');
  const pagerFactory = $injector.get('pagerFactory');
  const Private = $injector.get('Private');
  const timefilter = $injector.get('timefilter');

  timefilter.enabled = false;

  const limitTo = $filter('limitTo');
  // TODO: Extract this into an external service.
  const services = Private(SavedObjectRegistryProvider).byLoaderPropertiesName;
  const dashboardService = services.dashboards;
  const notify = new Notifier({ location: 'Dashboard' });

  let selectedItems = [];

  /**
   * Sorts hits either ascending or descending
   * @param  {Array} hits Array of saved finder object hits
   * @return {Array} Array sorted either ascending or descending
   */
  const sortItems = () => {
    this.items =
      this.isAscending
      ? _.sortBy(this.items, 'title')
      : _.sortBy(this.items, 'title').reverse();
  };

  const calculateItemsOnPage = () => {
    sortItems();
    this.pager.setTotalItems(this.items.length);
    this.pageOfItems = limitTo(this.items, this.pager.pageSize, this.pager.startIndex);
  };

  const fetchItems = () => {
    this.isFetchingItems = true;

    dashboardService.find(this.filter)
      .then(result => {
        this.isFetchingItems = false;
        this.items = result.hits;
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
  this.filter = '';

  this.pager = pagerFactory.create(this.items.length, 20, 1);

  $scope.$watch(() => this.filter, () => {
    deselectAll();
    fetchItems();
  });

  /**
   * Boolean that keeps track of whether hits are sorted ascending (true)
   * or descending (false) by title
   * @type {Boolean}
   */
  this.isAscending = true;

  this.toggleSort = function toggleSort() {
    this.isAscending = !this.isAscending;
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
      'Are you sure you want to delete the selected dashboards? This action is irreversible!',
      {
        confirmButtonText: 'Delete',
        onConfirm: doDelete
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

  this.getCreateDashboardHref = function getCreateDashboardHref() {
    return `#${DashboardConstants.CREATE_NEW_DASHBOARD_URL}`;
  };
}
