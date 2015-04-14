define(function (require) {

  var _ = require('lodash');
  require('plugins/field_editor/field_editor');

  require('routes')
  .when('/settings/indices/:indexPatternId/field/:fieldName', {
    mode: 'edit',
    template: require('text!plugins/field_editor/index.html'),
    resolve: {
      indexPattern: function ($route, courier) {
        return courier.indexPatterns.get($route.current.params.indexPatternId)
        .catch(courier.redirectWhenMissing('/settings/indices'));
      }
    },
    controllerAs: 'fieldEditorPage',
    controller: FieldEditorPageController
  })
  .when('/settings/indices/:indexPatternId/create-scripted-field', {
    mode: 'create-scripted',
    template: require('text!plugins/field_editor/index.html'),
    resolve: {
      indexPattern: function ($route, courier) {
        return courier.indexPatterns.get($route.current.params.indexPatternId)
        .catch(courier.redirectWhenMissing('/settings/indices'));
      }
    },
    controllerAs: 'fieldEditorPage',
    controller: FieldEditorPageController
  });

  function FieldEditorPageController($route, Private, Notifier, kbnUrl) {
    var Field = Private(require('components/index_patterns/_field'));
    var notify = new Notifier({ location: 'Field Editor' });

    this.mode = $route.current.mode;
    _.assign(this, $route.current.locals);

    if (this.mode === 'edit') {
      this.fieldName = $route.current.params.fieldName;
      this.field = this.indexPattern.fields.byName[this.fieldName];

      if (!this.field) {
        notify.error(this.indexPattern + ' does not have a "' + this.fieldName + '" field.');
        kbnUrl.redirect(this.indexPattern.editRoute);
        return;
      }
    }
    else if (this.mode === 'create-scripted') {
      this.field = new Field(this.indexPattern, {
        scripted: this.mode === 'create-scripted',
        type: 'number',
        name: 'New Scripted Field'
      });
    }
  }

});
