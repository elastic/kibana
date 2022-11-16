
import type { DataViewFieldBase, DataViewBase } from '../../es_query';
import { Feature } from 'geojson';
import { Filter, FilterMeta } from './types';
import { Polygon } from 'geojson';

export enum ES_SPATIAL_RELATIONS {
    INTERSECTS = 'INTERSECTS',
    DISJOINT = 'DISJOINT',
    WITHIN = 'WITHIN',
    CONTAINS = 'CONTAINS',
  }
export interface GeoShapeQueryBody {
    shape:  Polygon;
    relation: ES_SPATIAL_RELATIONS;
    //indexed_shape?: PreIndexedShape;
}

export interface GeoFilterParams {
    geo_shape: Feature;
    operation: ES_SPATIAL_RELATIONS;
    ignore_unmapped?:boolean
  }
type GeoShapeQuery = {
    [geoFieldName: string]: GeoShapeQueryBody;} &{
    ignore_unmapped: boolean; 
};

export type GeoFilter = Filter & {
    geo_shape?: GeoShapeQuery;
  };
/**
 * Creates a filter corresponding to a raw Elasticsearch query DSL object
 * @param query
 * @param index
 * @param alias
 * @returns `QueryStringFilter`
 *
 * @public
 */
 export const buildSpatialFilter = (
    indexPattern: DataViewBase,
    field: DataViewFieldBase,
    params: GeoFilterParams
  ):GeoFilter => {

    const meta: FilterMeta = {
        index: indexPattern?.id,
        params: {},
        negate:false    
      };
      return {
        meta,
        query:{
            geo_shape: {
                [field.name]: {
                    shape:params.geo_shape,
                    relation: params.operation,
                    
                },
                ignore_unmapped: params.ignore_unmapped || true,
            },
        }
      }
  };