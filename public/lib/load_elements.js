import { elementsRegistry } from './elements';
import { elementSpecs } from '../elements';

elementSpecs.forEach(elDef => elementsRegistry.register(elDef));
