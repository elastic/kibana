import 'plugins/markdown_vis/markdown_vis.less';
import 'plugins/markdown_vis/markdown_vis_controller';
import { VisTypeFactoryProvider } from 'ui/vis/vis_type';
import { AngularVisTypeFactoryProvider } from 'ui/vis/vis_types/angular_vis_type';
import markdownVisTemplate from 'plugins/markdown_vis/markdown_vis.html';
import markdownVisParamsTemplate from 'plugins/markdown_vis/markdown_vis_params.html';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import image from './images/icon-markdown.svg';
// we need to load the css ourselves

// we also need to load the controller and used by the template

// register the provider with the visTypes registry so that other know it exists
VisTypesRegistryProvider.register(MarkdownVisProvider);

function MarkdownVisProvider(Private) {
  const VisTypeFactory = Private(VisTypeFactoryProvider);
  const AngularVisTypeFactory = Private(AngularVisTypeFactoryProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return new AngularVisTypeFactory({
    name: 'markdown',
    title: 'Markdown',
    image,
    description: 'Create a document using markdown syntax',
    category: VisTypeFactory.CATEGORY.OTHER,
    visConfig: {
      template: markdownVisTemplate,
    },
    editorConfig: {
      optionsTemplate: markdownVisParamsTemplate
    },
    requestHandler: 'none',
    implementsRenderComplete: true,
  });
}

// export the provider so that the visType can be required with Private()
export default MarkdownVisProvider;
