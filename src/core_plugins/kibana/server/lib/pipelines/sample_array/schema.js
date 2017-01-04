import _ from 'lodash';
import Joi from 'joi';

export default Joi.array().items(Joi.object());
