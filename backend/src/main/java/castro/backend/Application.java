package castro.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.http.converter.protobuf.ProtobufJsonFormatHttpMessageConverter;
//import springfox.documentation.builders.ApiInfoBuilder;
//import springfox.documentation.builders.PathSelectors;
//import springfox.documentation.builders.RequestHandlerSelectors;
//import springfox.documentation.service.ApiInfo;
//import springfox.documentation.spi.DocumentationType;
//import springfox.documentation.spring.web.plugins.Docket;
//import springfox.documentation.swagger2.annotations.EnableSwagger2;

import java.util.Arrays;

@SpringBootApplication
//@EnableSwagger2
public class Application {
  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }

//  @Bean
//  public Docket repositoryApi() {
//    return new Docket(DocumentationType.SWAGGER_2)
//        .groupName("repository-api")
//        .apiInfo(apiInfo())
//        .select()
//        .paths(PathSelectors.ant("/api/repository/*"))
//        .build();
//  }
//
//  @Bean
//  public Docket api() {
//    return new Docket(DocumentationType.SWAGGER_2)
//        .select()
//        .apis(RequestHandlerSelectors.basePackage("castro.backend.controllers"))
//        .paths(PathSelectors.ant("/api/*"))
//        .build()
//        .apiInfo(apiInfo());
//  }
//
//  private ApiInfo apiInfo() {
//    return new ApiInfoBuilder()
//        .title("Backend API")
//        .description("Hello world")
//        .termsOfServiceUrl("http://springfox.io")
////        .license("Apache License Version 2.0")
////        .licenseUrl("https://github.com/springfox/springfox/blob/master/LICENSE")
////        .version("2.0")
//        .build();
//  }

  @Bean
  ProtobufJsonFormatHttpMessageConverter protobufHttpMessageConverter() {
    return new ProtobufJsonFormatHttpMessageConverter();
  }

  @Bean
  public CommandLineRunner commandLineRunner(ApplicationContext ctx) {
    return args -> {
      System.out.println("Let's inspect the beans provided by Spring Boot:");
      String[] beanNames = ctx.getBeanDefinitionNames();
      Arrays.sort(beanNames);
      for (String beanName : beanNames) {
        System.out.println(beanName);
      }
    };
  }

}