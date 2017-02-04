import SavedObjectRegistryProvider from 'ui/saved_objects/saved_object_registry';
import 'ui/pager_control';
import 'ui/pager';
import { DashboardConstants } from '../dashboard_constants';
import _ from 'lodash';

export function DashboardListingController(
  $filter,
  $scope,
  confirmModal,
  kbnUrl,
  Notifier,
  pagerService,
  Private,
  timefilter
) {
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

  const fetchObjects = () => {
    dashboardService.find(this.filter)
      .then(result => {
        this.items = result.hits;
        calculateItemsOnPage();
      });
  };

  this.items = [];
  this.pageOfItems = [];
  this.filter = '';

  this.pager = pagerService.create(this.items.length, 20, 1);

  /**
   * Boolean that keeps track of whether hits are sorted ascending (true)
   * or descending (false) by title
   * @type {Boolean}
   */
  this.isAscending = true;

  this.toggleSort = function toggleSort() {
    this.isAscending = !this.isAscending;
    calculateItemsOnPage();
  };

  this.toggleAll = function toggleAll() {
    if (this.areAllItemsChecked()) {
      selectedItems = [];
    } else {
      selectedItems = this.items.slice(0);
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
    return this.getSelectedItemsCount() === this.items.length;
  };

  this.getSelectedItemsCount = function getSelectedItemsCount() {
    return selectedItems.length;
  };

  this.deleteSelectedItems = function deleteSelectedItems() {
    const doDelete = () => {
      const selectedIds = selectedItems.map(item => item.id);

      dashboardService.delete(selectedIds)
        .then(fetchObjects)
        .then(() => {
          selectedItems = [];
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
    this.pager.nextPage();
    calculateItemsOnPage();
  };

  this.onPagePrevious = () => {
    this.pager.previousPage();
    calculateItemsOnPage();
  };

  this.getUrlForItem = function getUrlForItem(item) {
    return `#/dashboard/${item.id}`;
  };

  $scope.$watch(() => this.filter, () => {
    fetchObjects();
  });
}
