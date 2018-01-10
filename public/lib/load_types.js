import { typeSpecs } from '../../common/types';
import { typesRegistry } from './types_registry';

typeSpecs.forEach(typeDef => typesRegistry.register(typeDef));
