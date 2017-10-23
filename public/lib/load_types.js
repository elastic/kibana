import { typesRegistry } from '../../common/lib/types';
import { typeSpecs } from '../../common/types';

typeSpecs.forEach(typeDef => typesRegistry.register(typeDef));
