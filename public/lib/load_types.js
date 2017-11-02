import { typesRegistry } from './types_registry';
import { typeSpecs } from '../../common/types';

typeSpecs.forEach(typeDef => typesRegistry.register(typeDef));
