import SavedObjectRegistryProvider from 'ui/saved_objects/saved_object_registry';

export function VisualizeListingController(
  $scope,
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
    });
  };

  this.items = [];
  this.filter = '';

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
    const selectedIds = selectedItems.map(item => item.id);

    visualizationService.delete(selectedIds)
      .then(fetchObjects)
      .then(() => {
        selectedItems = [];
      })
      .catch(error => notify.error(error));
  };

  this.open = function open(item) {
    kbnUrl.change(item.url.substr(1));
  };

  this.edit = function edit(item) {
    const params = {
      // TODO: Get this value from somewhere instead of hardcoding it.
      service: 'savedVisualizations',
      id: item.id
    };

    kbnUrl.change('/management/kibana/objects/{{ service }}/{{ id }}', params);
  };

  $scope.$watch(() => this.filter, () => {
    fetchObjects();
  });
}
