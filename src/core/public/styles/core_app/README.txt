These files are only used as sass-loader globals (`additionalData`) by the Rspack optimizer's SCSS rules, located here: `packages/kbn-optimizer/src/config/shared_config.ts`.
The standalone webpack configs in `src/platform/packages/shared/kbn-storybook` and `src/platform/plugins/shared/console/packaging` import the light-theme globals the same way.
