import SavedObjectRegistryProvider from 'ui/saved_objects/saved_object_registry';
import 'ui/pager_control';
import 'ui/pager';
import _ from 'lodash';

export function VisualizeListingController($injector, $scope) {
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
  const visualizationService = services.visualizations;
  const notify = new Notifier({ location: 'Visualize' });

  let selectedItems = [];

  /**
   * Sorts hits either ascending or descending
   * @param  {Array} hits Array of saved finder object hits
   * @return {Array} Array sorted either ascending or descending
   */
  const sortItems = () => {
    const sortProperty = this.getSortProperty();

    this.items =
      sortProperty.isAscending
      ? _.sortBy(this.items, sortProperty.getValue)
      : _.sortBy(this.items, sortProperty.getValue).reverse();
  };

  const calculateItemsOnPage = () => {
    sortItems();
    this.pager.setTotalItems(this.items.length);
    this.pageOfItems = limitTo(this.items, this.pager.pageSize, this.pager.startIndex);
  };

  const fetchItems = () => {
    this.isFetchingItems = true;

    visualizationService.find(this.filter)
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
    return this.sortProperties.find(property => property.isSelected);
  };

  this.getSortPropertyByName = function getSortPropertyByName(name) {
    return this.sortProperties.find(property => property.name === name);
  };

  this.isAscending = function isAscending() {
    const sortProperty = this.getSortProperty();
    return sortProperty.isAscending;
  };

  this.sortOn = function sortOn(propertyName) {
    const sortProperty = this.getSortProperty();

    if (sortProperty.name === propertyName) {
      sortProperty.isAscending = !sortProperty.isAscending;
    } else {
      sortProperty.isSelected = false;
      this.getSortPropertyByName(propertyName).isSelected = true;
    }

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
    return selectedItems.includes(item);
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

      visualizationService.delete(selectedIds)
        .then(fetchItems)
        .then(() => {
          deselectAll();
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
    return `#/visualize/edit/${item.id}`;
  };
}
