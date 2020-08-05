module.exports = {	
  root: true,	
  extends: ['@elastic/eslint-config-kibana', 'plugin:@elastic/eui/recommended'],
  <%_ if (!isKibanaPlugin) { -%>
  rules: {
    "@kbn/eslint/require-license-header": "off"
  }
  <%_ } -%>
};