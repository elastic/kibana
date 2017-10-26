import { elementsRegistry } from './elements_registry';
import { elementSpecs } from '../elements';

elementSpecs.forEach(elDef => elementsRegistry.register(elDef));
