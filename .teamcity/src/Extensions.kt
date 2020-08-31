import jetbrains.buildServer.configs.kotlin.v2019_2.*

fun BuildFeatures.Junit(dirs: String = "target/**/TEST-*.xml") {
  feature {
    type = "xml-report-plugin"
    param("xmlReportParsing.reportType", "junit")
    param("xmlReportParsing.reportDirs", dirs)
  }
}
