describe('Terms Agg', function () {
  describe('order agg editor UI', function () {
    it('defaults to the first metric agg');
    it('adds "custom metric" option');
    it('lists all metric agg responses');
    it('lists individual values of a multi-value metric');
    it('selects "custom metric" if there are no metric aggs');
    it('is emptied if the selected metric is removed');
    it('displays a metric editor if "custom metric" is selected');
    it('saves the "custom metric" to state and refreshes from it');
    it('invalidates the form if the metric agg form is not complete');
  });
});
