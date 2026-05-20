import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { DashboardSavedObjectTypeMigrationsDeps } from '../dashboard_saved_object_migrations';
import type { DashboardAttributes } from '../../schema/v1';
/**
 * In 7.8.0 we introduced dashboard drilldowns which are stored inside dashboard saved object as part of embeddable state
 * In 7.11.0 we created an embeddable references/migrations system that allows to properly extract embeddable persistable state
 * https://github.com/elastic/kibana/issues/71409
 * The idea of this migration is to inject all the embeddable panel references and then run the extraction again.
 * As the result of the extraction:
 * 1. In addition to regular `panel_` we will get new references which are extracted by `embeddablePersistableStateService` (dashboard drilldown references)
 * 2. `panel_` references will be regenerated
 * All other references like index-patterns are forwarded non touched
 * @param deps
 */
export declare function createExtractPanelReferencesMigration(deps: DashboardSavedObjectTypeMigrationsDeps): SavedObjectMigrationFn<DashboardAttributes>;
