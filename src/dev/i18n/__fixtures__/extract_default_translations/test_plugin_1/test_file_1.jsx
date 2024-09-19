/* eslint-disable */

// Angular service
i18n('plugin_1.id_1', { defaultMessage: 'Message 1' });

// @kbn/i18n
i18n.translate('plugin_1.id_2', {
  defaultMessage: 'Message 2',
  description: 'Message description',
});

// React component. FormattedMessage, Intl.formatMessage()
class Component extends PureComponent {
  render() {
    return (
      <div>
        <FormattedMessage
          id="plugin_1.id_3"
          defaultMessage="Message 3"
        />
        {intl.formatMessage({ id: 'plugin_1.id_4', defaultMessage: 'Message 4' })}
      </div>
    );
  }
}
