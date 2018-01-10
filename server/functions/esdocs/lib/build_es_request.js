import { buildBoolArray } from './build_bool_array';

export function buildESRequest(esRequest, canvasQuery) {
  if (canvasQuery.size) {
    esRequest = { ...esRequest, size: canvasQuery.size };
  }

  if (canvasQuery.and) {
    esRequest.body.query.bool.must = buildBoolArray(canvasQuery.and);
  }

  return esRequest;
}
