import { addFunction } from './add_function';
import { clientFunctions } from '../functions';
import { commonFunctions } from '../../common/functions';

clientFunctions.forEach(addFunction);
commonFunctions.forEach(addFunction);
