import './vis_controller';
import './editor_controller';
import 'react-select/dist/react-select.css';
import './vis.less';
import { VisVisTypeProvider } from 'ui/vis/vis_type';
import { TemplateVisTypeProvider } from 'ui/template_vis_type/template_vis_type';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { newField } from './lib/editor_utils';
VisTypesRegistryProvider.register(TermsProvider);

export default function TermsProvider(Private) {
  const VisType = Private(VisVisTypeProvider);
  const TemplateVisType = Private(TemplateVisTypeProvider);

  return new TemplateVisType({
    name: 'terms',
    title: 'Terms',
    implementsRenderComplete: true,
    description: 'Terms filter control',
    category: VisType.CATEGORY.CONTROL,
    template: require('./vis.html'),
    params: {
      editor: require('./editor.html'),
      defaults: {
        fields: [newField()]
      }
    },
    requiresSearch: false
  });
}
