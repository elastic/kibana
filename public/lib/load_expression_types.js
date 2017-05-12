import { addExpressionType } from './add_expression_type';
import { addArgType } from './add_arg_type';
import expressionArgTypes from '../expression_types/arg_types';
import expressionDatasources from '../expression_types/datasources';
import expressionTransforms from '../expression_types/transforms';
import expressionModels from '../expression_types/models';
import expressionViews from '../expression_types/views';

// register default args, arg types, and expression types
expressionArgTypes.forEach(expFn => addArgType(expFn()));
expressionDatasources.forEach(expFn => addExpressionType('datasource', expFn()));
expressionTransforms.forEach(expFn => addExpressionType('transform', expFn()));
expressionModels.forEach(expFn => addExpressionType('model', expFn()));
expressionViews.forEach(expFn => addExpressionType('view', expFn()));
