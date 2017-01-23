import SavedObjectRegistryProvider from 'ui/saved_objects/saved_object_registry';
import { DashboardConstants } from '../dashboard_constants';
import _ from 'lodash';

export function DashboardListingController(
  $scope,
  kbnUrl,
  Notifier,
  Private,
  timefilter,
  safeConfirm
) {
  timefilter.enabled = false;

  // TODO: Extract this into an external service.
  const services = Private(SavedObjectRegistryProvider).byLoaderPropertiesName;
  const dashboardService = services.dashboards;
  const notify = new Notifier({ location: 'Dashboard' });

  let selectedItems = [];

  const fetchObjects = () => {
    dashboardService.find(this.filter)
      .then(result => {
        this.items = result.hits;
      });
  };

  this.items = [];
  this.filter = '';

  /**
   * Boolean that keeps track of whether hits are sorted ascending (true)
   * or descending (false) by title
   * @type {Boolean}
   */
  this.isAscending = true;

  /**
   * Sorts hits either ascending or descending
   * @param  {Array} hits Array of saved finder object hits
   * @return {Array} Array sorted either ascending or descending
   */
  this.sortHits = function () {
    this.isAscending = !this.isAscending;
    this.items = this.isAscending ? _.sortBy(this.items, 'title') : _.sortBy(this.items, 'title').reverse();
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
    safeConfirm('Are you sure you want to delete the selected dashboards? This action is irreversible!',
        { confirmButtonText: 'Delete', cancelButtonText: 'Cancel' })
      .then(() => {
        const selectedIds = selectedItems.map(item => item.id);

        dashboardService.delete(selectedIds)
          .then(fetchObjects)
          .then(() => {
            selectedItems = [];
          })
          .catch(error => notify.error(error));
      });
  };

  this.open = function open(item) {
    kbnUrl.change(item.url.substr(1));
  };

  $scope.$watch(() => this.filter, () => {
    fetchObjects();
  });
}
