import { elementSpecs } from '../elements';
import { elementsRegistry } from './elements_registry';

elementSpecs.forEach(elDef => elementsRegistry.register(elDef));
