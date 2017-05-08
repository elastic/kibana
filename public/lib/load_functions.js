import { addFunction } from './add_function';

addFunction(require('../functions/clientdata/clientdata'));
addFunction(require('../functions/navigator/navigator'));

addFunction(require('../../common/functions/mapColumn/mapColumn'));
addFunction(require('../../common/functions/alterColumn/alterColumn'));

addFunction(require('../../common/functions/sort/sort'));
addFunction(require('../../common/functions/render/render'));
addFunction(require('../../common/functions/line/line'));
addFunction(require('../../common/functions/pointseries/pointseries'));
