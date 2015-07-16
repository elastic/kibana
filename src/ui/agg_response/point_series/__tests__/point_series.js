define(function (require) {
  describe('Point Series Agg Response', function () {
    describe(require('specs/components/agg_response/point_series/_main'));
    describe(require('specs/components/agg_response/point_series/_add_to_siri'));
    describe(require('specs/components/agg_response/point_series/_fake_x_aspect'));
    describe(require('specs/components/agg_response/point_series/_get_aspects'));
    describe(require('specs/components/agg_response/point_series/_get_point'));
    describe(require('specs/components/agg_response/point_series/_get_series'));
    describe(require('specs/components/agg_response/point_series/_init_x_axis'));
    describe(require('specs/components/agg_response/point_series/_init_y_axis'));
    describe(require('specs/components/agg_response/point_series/_ordered_date_axis'));
    describe(require('specs/components/agg_response/point_series/_tooltip_formatter'));
  });
});
