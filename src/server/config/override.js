import _ from 'lodash';
import explodeBy from './explode_by';
import { getFlattenedObject } from '../../utils';

export default function (target, source) {
  const _target = getFlattenedObject(target);
  const _source = getFlattenedObject(source);
  return explodeBy('.', _.defaults(_source, _target));
}
