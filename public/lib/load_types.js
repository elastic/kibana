import { types as typesRegistry } from './types';
import { typeSpecs } from '../../common/types';

typeSpecs.forEach(typeDef => typesRegistry.register(typeDef));
