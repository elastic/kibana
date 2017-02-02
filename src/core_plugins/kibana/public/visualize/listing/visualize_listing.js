import SavedObjectRegistryProvider from 'ui/saved_objects/saved_object_registry';
import _ from 'lodash';

export function VisualizeListingController(
  $scope,
  confirmModal,
  kbnUrl,
  Notifier,
  Private,
  timefilter
) {
  timefilter.enabled = false;

  // TODO: Extract this into an external service.
  const services = Private(SavedObjectRegistryProvider).byLoaderPropertiesName;
  const visualizationService = services.visualizations;
  const notify = new Notifier({ location: 'Visualize' });

  let selectedItems = [];

  const fetchObjects = () => {
    visualizationService.find(this.filter)
    .then(result => {
      this.items = result.hits;
      this.sortItems();
    });
  };

  this.items = [];
  this.filter = '';

  /**
   * Remember sort direction per property.
   */
  this.sortProperties = [{
    name: 'title',
    getValue: item => item.title,
    isSelected: true,
    isAscending: true,
  }, {
    name: 'type',
    getValue: item => item.type.title,
    isSelected: false,
    isAscending: true,
  }];

  this.getSortProperty = function getSortProperty() {
    return _.find(this.sortProperties, property => property.isSelected);
  };

  this.getSortPropertyByName = function getSortPropertyByName(name) {
    return _.find(this.sortProperties, property => property.name === name);
  };

  this.isAscending = function isAscending() {
    const sortProperty = this.getSortProperty();
    return sortProperty.isAscending;
  };

  /**
   * Sorts hits either ascending or descending
   * @param  {Array} hits Array of saved finder object hits
   * @return {Array} Array sorted either ascending or descending
   */
  this.sortItems = function sortItems() {
    const sortProperty = this.getSortProperty();

    this.items =
      sortProperty.isAscending
      ? _.sortBy(this.items, sortProperty.getValue)
      : _.sortBy(this.items, sortProperty.getValue).reverse();
  };

  this.sortOn = function sortOn(propertyName) {
    const sortProperty = this.getSortProperty();

    if (sortProperty.name === propertyName) {
      sortProperty.isAscending = !sortProperty.isAscending;
    } else {
      sortProperty.isSelected = false;
      this.getSortPropertyByName(propertyName).isSelected = true;
    }

    this.sortItems();
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

      visualizationService.delete(selectedIds)
        .then(fetchObjects)
        .then(() => {
          selectedItems = [];
        })
        .catch(error => notify.error(error));
    };

    confirmModal(
      'Are you sure you want to delete the selected visualizations? This action is irreversible!',
      {
        confirmButtonText: 'Delete',
        onConfirm: doDelete
      });
  };

  this.getUrlForItem = function getUrlForItem(item) {
    return `#/visualize/edit/${item.id}`;
  };

  $scope.$watch(() => this.filter, () => {
    fetchObjects();
  });
}
