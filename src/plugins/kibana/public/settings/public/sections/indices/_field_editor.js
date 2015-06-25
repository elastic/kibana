define(function (require) {
  require('components/field_editor/field_editor');
  require('plugins/settings/sections/indices/_index_header');

  require('routes')
  .when('/settings/indices/:indexPatternId/field/:fieldName', { mode: 'edit' })
  .when('/settings/indices/:indexPatternId/create-field/', { mode: 'create' })
  .defaults(/settings\/indices\/[^\/]+\/(field|create-field)(\/|$)/, {
    template: require('text!plugins/settings/sections/indices/_field_editor.html'),
    resolve: {
      indexPattern: function ($route, courier) {
        return courier.indexPatterns.get($route.current.params.indexPatternId)
        .catch(courier.redirectWhenMissing('/settings/indices'));
      }
    },
    controllerAs: 'fieldSettings',
    controller: function FieldEditorPageController($route, Private, Notifier, docTitle) {
      var Field = Private(require('components/index_patterns/_field'));
      var notify = new Notifier({ location: 'Field Editor' });
      var kbnUrl = Private(require('components/url/url'));


      this.mode = $route.current.mode;
      this.indexPattern = $route.current.locals.indexPattern;


      if (this.mode === 'edit') {
        var fieldName = $route.current.params.fieldName;
        this.field = this.indexPattern.fields.byName[fieldName];

        if (!this.field) {
          notify.error(this.indexPattern + ' does not have a "' + fieldName + '" field.');
          kbnUrl.redirectToRoute(this.indexPattern, 'edit');
          return;
        }

      }
      else if (this.mode === 'create') {
        this.field = new Field(this.indexPattern, {
          scripted: true,
          type: 'number'
        });
      }
      else {
        throw new Error('unknown fieldSettings mode ' + this.mode);
      }

      docTitle.change([this.field.name || 'New Scripted Field', this.indexPattern.id]);
      this.goBack = function () {
        kbnUrl.changeToRoute(this.indexPattern, 'edit');
      };
    }
  });

});
