import './markdown_vis.less';
import { MarkdownVisWrapper } from './markdown_vis_controller';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { CATEGORY } from 'ui/vis/vis_category';
import markdownVisParamsTemplate from './markdown_vis_params.html';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import image from './images/icon-markdown.svg';
import { DefaultEditorSize } from 'ui/vis/editor_size';
// we need to load the css ourselves

// we also need to load the controller and used by the template

// register the provider with the visTypes registry so that other know it exists
VisTypesRegistryProvider.register(MarkdownVisProvider);

function MarkdownVisProvider(Private) {
  const VisFactory = Private(VisFactoryProvider);

  // return the visType object, which kibana will use to display and configure new
  // Vis object of this type.
  return VisFactory.createReactVisualization({
    name: 'markdown',
    title: 'Markdown',
    isAccessible: true,
    image,
    description: 'Create a document using markdown syntax',
    category: CATEGORY.OTHER,
    visConfig: {
      component: MarkdownVisWrapper,
      defaults: {
        fontSize: 12,
        openLinksInNewTab: false
      }
    },
    editorConfig: {
      optionsTemplate: markdownVisParamsTemplate,
      enableAutoApply: true,
      defaultSize: DefaultEditorSize.LARGE,
    },
    options: {
      showTimePicker: false,
    },
    requestHandler: 'none',
    responseHandler: 'none',
  });
}

// export the provider so that the visType can be required with Private()
export default MarkdownVisProvider;
