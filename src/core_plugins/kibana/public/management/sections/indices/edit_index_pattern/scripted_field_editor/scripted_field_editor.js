import 'ui/field_editor';
import { IndexPatternsFieldProvider } from 'ui/index_patterns/_field';
import { KbnUrlProvider } from 'ui/url';
import uiRoutes from 'ui/routes';
import template from './scripted_field_editor.html';

uiRoutes
.when('/management/kibana/indices/:indexPatternId/field/:fieldName*', { mode: 'edit' })
.when('/management/kibana/indices/:indexPatternId/create-field/', { mode: 'create' })
.defaults(/management\/kibana\/indices\/[^\/]+\/(field|create-field)(\/|$)/, {
  template,
  mapBreadcrumbs($route, breadcrumbs) {
    const { indexPattern } = $route.current.locals;
    return breadcrumbs.map(crumb => {
      if (crumb.id !== indexPattern.id) {
        return crumb;
      }

      return {
        ...crumb,
        display: indexPattern.title
      };
    });
  },
  resolve: {
    indexPattern: function ($route, courier) {
      return courier.indexPatterns.get($route.current.params.indexPatternId)
      .catch(courier.redirectWhenMissing('/management/kibana/indices'));
    }
  },
  controllerAs: 'fieldSettings',
  controller: function FieldEditorPageController($route, Private, Notifier, docTitle) {
    const Field = Private(IndexPatternsFieldProvider);
    const notify = new Notifier({ location: 'Field Editor' });
    const kbnUrl = Private(KbnUrlProvider);

    this.mode = $route.current.mode;
    this.indexPattern = $route.current.locals.indexPattern;


    if (this.mode === 'edit') {
      const fieldName = $route.current.params.fieldName;
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

    docTitle.change([this.field.name || 'New Scripted Field', this.indexPattern.title]);
    this.goBack = function () {
      kbnUrl.changeToRoute(this.indexPattern, 'edit');
    };
  }
});
