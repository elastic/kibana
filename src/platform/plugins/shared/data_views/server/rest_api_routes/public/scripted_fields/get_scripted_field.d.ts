import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from '../../../types';
export declare const registerGetScriptedFieldRoute: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>) => void;
